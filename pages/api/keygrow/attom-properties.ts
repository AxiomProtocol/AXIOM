import type { NextApiRequest, NextApiResponse } from 'next';
import { propertyDataService } from '../../../lib/services/PropertyDataService';

const API_TIMEOUT = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      postalCode, 
      city, 
      state,
      propertyType, 
      minBeds,
      minBaths,
      minValue,
      maxValue,
      orderBy,
      page = '1', 
      pageSize = '20',
      includeRentCast = 'true',
      includeWalkScore = 'true',
      includeMetrics = 'true'
    } = req.query;

    const config = propertyDataService.isConfigured();
    const zipCode = (postalCode as string) || '78244';
    
    const sampleProperties = propertyDataService.getSampleProperties(zipCode);
    return res.status(200).json({
      success: true,
      properties: sampleProperties,
      total: sampleProperties.length,
      page: 1,
      pageSize: 20,
      usingSampleData: true
    });
    
    if (!config.attom) {
      return res.status(503).json({
        success: false,
        error: 'ATTOM API not configured',
        message: 'Property data service requires ATTOM API key to be configured',
        properties: [],
        total: 0
      });
    }

    const sampleFallback = {
      properties: propertyDataService.getSampleProperties(zipCode),
      total: 3,
      page: 1,
      pageSize: 20,
      usingSampleData: true,
      apiError: 'Request timed out - showing sample properties'
    };

    let result;

    if (postalCode && typeof postalCode === 'string') {
      result = await withTimeout(
        propertyDataService.fetchPropertiesByZipCode({
          postalCode,
          propertyType: propertyType as string,
          orderBy: orderBy as string,
          page: parseInt(page as string) || 1,
          pageSize: Math.min(parseInt(pageSize as string) || 20, 50),
          minValue: minValue ? parseInt(minValue as string) : undefined,
          maxValue: maxValue ? parseInt(maxValue as string) : undefined
        }),
        API_TIMEOUT,
        sampleFallback
      );
    } else if (city && state && typeof city === 'string' && typeof state === 'string') {
      result = await withTimeout(
        propertyDataService.fetchPropertiesByCity({
          city,
          state,
          propertyType: propertyType as string,
          minBeds: minBeds ? parseInt(minBeds as string) : undefined,
          minBaths: minBaths ? parseInt(minBaths as string) : undefined,
          minValue: minValue ? parseInt(minValue as string) : undefined,
          maxValue: maxValue ? parseInt(maxValue as string) : undefined,
          page: parseInt(page as string) || 1,
          pageSize: Math.min(parseInt(pageSize as string) || 20, 50)
        }),
        API_TIMEOUT,
        sampleFallback
      );
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Please provide either postalCode or both city and state',
        properties: [],
        total: 0
      });
    }

    const shouldFetchRentCast = includeRentCast === 'true' && config.rentcast;
    const shouldFetchWalkScore = includeWalkScore === 'true' && config.walkScore;
    const shouldCalculateMetrics = includeMetrics === 'true';
    
    let rentEstimates = new Map();
    let walkScores = new Map();

    const propertiesToEnrich = result.properties
      .filter(p => p.addressLine1 && p.city && p.state && p.zipCode)
      .slice(0, 10)
      .map(p => ({
        address: p.addressLine1,
        city: p.city,
        state: p.state,
        zipCode: p.zipCode,
        propertyType: p.propertyType,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        squareFootage: p.squareFeet,
        latitude: p.latitude,
        longitude: p.longitude
      }));

    const enrichmentPromises: Promise<any>[] = [];

    if (shouldFetchRentCast && result.properties.length > 0) {
      enrichmentPromises.push(
        propertyDataService.batchFetchRentEstimates(propertiesToEnrich)
          .then(data => { rentEstimates = data; })
          .catch(err => console.error('RentCast batch fetch error:', err))
      );
    }

    if (shouldFetchWalkScore && result.properties.length > 0) {
      enrichmentPromises.push(
        propertyDataService.batchFetchWalkScores(propertiesToEnrich)
          .then(data => { walkScores = data; })
          .catch(err => console.error('Walk Score batch fetch error:', err))
      );
    }

    await Promise.all(enrichmentPromises);

    const propertiesWithEnrichedData = result.properties.map(prop => {
      const propKey = `${prop.addressLine1}, ${prop.city}, ${prop.state}`;
      const rentCastData = rentEstimates.get(propKey);
      const walkScoreData = walkScores.get(propKey);
      
      let monthlyRentUsd: number | null = null;
      let rentRangeLow: number | null = null;
      let rentRangeHigh: number | null = null;
      let rentSource = 'estimate';
      let rentCompsCount = 0;

      if (rentCastData && rentCastData.rent) {
        monthlyRentUsd = rentCastData.rent;
        rentRangeLow = rentCastData.rentRangeLow;
        rentRangeHigh = rentCastData.rentRangeHigh;
        rentSource = 'rentcast';
        rentCompsCount = rentCastData.comparablesCount || 0;
      } else if (prop.estimatedValueUsd) {
        monthlyRentUsd = Math.round(prop.estimatedValueUsd * 0.007);
        rentSource = 'estimate';
      }

      let rentToOwnMetrics = null;
      if (shouldCalculateMetrics && prop.estimatedValueUsd && monthlyRentUsd) {
        rentToOwnMetrics = propertyDataService.calculateRentToOwnMetrics({
          propertyValue: prop.estimatedValueUsd,
          monthlyRent: monthlyRentUsd,
          annualTaxes: prop.assessedValue ? prop.assessedValue * 0.012 : undefined,
          equityPerPayment: 0.20
        });
      }
      
      return {
        ...prop,
        monthlyRentUsd,
        rentRangeLow,
        rentRangeHigh,
        rentSource,
        rentCompsCount,
        monthlyRentAxm: monthlyRentUsd ? Math.round(monthlyRentUsd / 0.00033) : null,
        totalValueAxm: prop.estimatedValueUsd ? Math.round(prop.estimatedValueUsd / 0.00033) : null,
        minimumTermMonths: 60,
        maximumTermMonths: 240,
        photoDisclaimer: 'Representative photos. Actual property may differ.',
        isForRent: false,
        
        walkScore: walkScoreData?.walkScore || null,
        walkDescription: walkScoreData?.walkDescription || null,
        transitScore: walkScoreData?.transitScore || null,
        transitDescription: walkScoreData?.transitDescription || null,
        bikeScore: walkScoreData?.bikeScore || null,
        bikeDescription: walkScoreData?.bikeDescription || null,
        
        metrics: rentToOwnMetrics ? {
          priceToRentRatio: rentToOwnMetrics.priceToRentRatio,
          affordabilityIndex: rentToOwnMetrics.monthlyAffordabilityIndex,
          breakEvenMonths: rentToOwnMetrics.breakEvenMonths,
          projectedEquity: {
            year1: rentToOwnMetrics.projectedEquityYear1,
            year3: rentToOwnMetrics.projectedEquityYear3,
            year5: rentToOwnMetrics.projectedEquityYear5
          },
          monthlyOwnership: {
            rent: rentToOwnMetrics.estimatedMonthlyPayment,
            taxes: rentToOwnMetrics.estimatedTaxesMonthly,
            insurance: rentToOwnMetrics.estimatedInsuranceMonthly,
            total: rentToOwnMetrics.totalMonthlyOwnership
          },
          investorMetrics: {
            capRate: rentToOwnMetrics.capRate,
            cashOnCash: rentToOwnMetrics.cashOnCashReturn
          }
        } : null
      };
    });

    const usingSampleData = 'usingSampleData' in result && result.usingSampleData;
    const apiError = 'apiError' in result ? result.apiError : undefined;

    return res.status(200).json({
      success: true,
      properties: propertiesWithEnrichedData,
      total: result.total,
      page: 'page' in result ? result.page : parseInt(page as string),
      pageSize: 'pageSize' in result ? result.pageSize : parseInt(pageSize as string),
      source: usingSampleData ? 'sample' : 'attom',
      usingSampleData,
      apiError,
      rentSource: shouldFetchRentCast ? 'rentcast' : 'estimate',
      walkScoreEnabled: shouldFetchWalkScore && config.walkScore,
      metricsEnabled: shouldCalculateMetrics,
      disclaimers: {
        photos: 'Photos shown are representative images based on property type, not actual subject property photos.',
        rent: shouldFetchRentCast 
          ? 'Rental rates provided by RentCast based on comparable properties in the area.'
          : 'Rental rates are estimated based on property value. Verify with local market data.',
        availability: 'Properties shown are from public records. Contact agent to verify rent-to-own availability.',
        walkScore: 'Walk Score, Transit Score, and Bike Score are trademarks of Walk Score. Data provided by Walk Score API.',
        metrics: 'Financial projections are estimates based on current market conditions and KeyGrow program terms. Actual results may vary.',
        sampleData: usingSampleData 
          ? 'Showing sample properties. Live property data is temporarily unavailable.'
          : undefined
      }
    });

  } catch (error) {
    console.error('Error fetching ATTOM properties:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch properties',
      properties: [],
      total: 0
    });
  }
}
