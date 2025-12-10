import axios from 'axios';

interface PropertyAddress {
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
}

interface WalkScoreData {
  walkScore: number | null;
  walkDescription: string | null;
  transitScore: number | null;
  transitDescription: string | null;
  bikeScore: number | null;
  bikeDescription: string | null;
}

interface RentToOwnMetrics {
  priceToRentRatio: number | null;
  monthlyAffordabilityIndex: number | null;
  breakEvenMonths: number | null;
  projectedEquityYear1: number | null;
  projectedEquityYear3: number | null;
  projectedEquityYear5: number | null;
  estimatedMonthlyPayment: number | null;
  estimatedTaxesMonthly: number | null;
  estimatedInsuranceMonthly: number | null;
  totalMonthlyOwnership: number | null;
  capRate: number | null;
  cashOnCashReturn: number | null;
}

interface ATTOMPropertyData {
  attomId?: string;
  estimatedValue?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  taxAssessedValue?: number;
  yearBuilt?: number;
  lotSizeSqFt?: number;
  livingAreaSqFt?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  zoning?: string;
  ownerName?: string;
  latitude?: number;
  longitude?: number;
  fipsCode?: string;
  apn?: string;
  photos?: string[];
  rawData?: any;
}

interface RentCastPropertyData {
  rentcastId?: string;
  estimatedRent?: number;
  estimatedValue?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  propertyType?: string;
  hoaFees?: number;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  rawData?: any;
}

interface EnrichedPropertyData {
  attom?: ATTOMPropertyData;
  rentcast?: RentCastPropertyData;
  combined: {
    estimatedValueUsd?: number;
    estimatedRentUsd?: number;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    yearBuilt?: number;
    propertyType?: string;
    latitude?: number;
    longitude?: number;
    photos?: string[];
  };
}

interface ATTOMPropertyListing {
  identifier: {
    obPropId?: number;
    fips?: string;
    apn?: string;
    attomId?: number;
  };
  lot?: {
    lotSize1?: number;
    lotSize2?: number;
  };
  address: {
    country?: string;
    countrySubd?: string;
    line1?: string;
    line2?: string;
    locality?: string;
    oneLine?: string;
    postal1?: string;
    postal2?: string;
  };
  location?: {
    latitude?: string;
    longitude?: string;
    accuracy?: string;
    distance?: number;
  };
  summary?: {
    propclass?: string;
    propsubtype?: string;
    proptype?: string;
    yearbuilt?: number;
    propLandUse?: string;
  };
  building?: {
    size?: {
      universalsize?: number;
      livingsize?: number;
      bldgsize?: number;
    };
    rooms?: {
      bathstotal?: number;
      beds?: number;
    };
  };
  avm?: {
    amount?: {
      value?: number;
      low?: number;
      high?: number;
    };
  };
  sale?: {
    amount?: {
      saleamt?: number;
      saletransdate?: string;
    };
  };
}

class PropertyDataService {
  private attomBaseUrl = 'https://api.gateway.attomdata.com';
  private rentcastBaseUrl = 'https://api.rentcast.io/v1';
  private walkScoreBaseUrl = 'https://api.walkscore.com';
  private maxRetries = 1;
  private requestTimeout = 7000;

  private get attomApiKey(): string | undefined {
    return process.env.ATTOM_API_KEY || process.env.ATTOM_API_KET;
  }

  private get rentcastApiKey(): string | undefined {
    return process.env.RENTCAST_API_KEY;
  }

  private get walkScoreApiKey(): string | undefined {
    return process.env.WALKSCORE_API_KEY;
  }

  constructor() {
    // API keys are now loaded lazily via getters to ensure they're read at request time
    // This fixes production deployments where secrets aren't available at build time
  }

  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isRetryable = error.code === 'ECONNABORTED' || 
          error.response?.status === 504 || 
          error.response?.status === 503 ||
          error.response?.status === 502;
        
        if (!isRetryable || attempt === retries) {
          throw error;
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`ATTOM API retry ${attempt + 1}/${retries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  getSampleProperties(postalCode: string): any[] {
    return [
      {
        attomId: 'sample-1',
        propertyName: '123 Main Street',
        propertyType: 'SFR',
        propertyTypeDisplay: 'Single Family',
        addressLine1: '123 Main Street',
        city: 'Phoenix',
        state: 'AZ',
        zipCode: postalCode,
        fullAddress: `123 Main Street, Phoenix, AZ ${postalCode}`,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1850,
        yearBuilt: 2015,
        estimatedValueUsd: 285000,
        estimatedValueLow: 270000,
        estimatedValueHigh: 300000,
        photos: this.generatePropertyImages(1, 'SFR'),
        status: 'sample',
        source: 'sample',
        isSampleData: true
      },
      {
        attomId: 'sample-2',
        propertyName: '456 Oak Avenue',
        propertyType: 'SFR',
        propertyTypeDisplay: 'Single Family',
        addressLine1: '456 Oak Avenue',
        city: 'Phoenix',
        state: 'AZ',
        zipCode: postalCode,
        fullAddress: `456 Oak Avenue, Phoenix, AZ ${postalCode}`,
        bedrooms: 4,
        bathrooms: 2.5,
        squareFeet: 2200,
        yearBuilt: 2018,
        estimatedValueUsd: 345000,
        estimatedValueLow: 325000,
        estimatedValueHigh: 365000,
        photos: this.generatePropertyImages(2, 'SFR'),
        status: 'sample',
        source: 'sample',
        isSampleData: true
      },
      {
        attomId: 'sample-3',
        propertyName: '789 Sunset Boulevard',
        propertyType: 'CONDO',
        propertyTypeDisplay: 'Condominium',
        addressLine1: '789 Sunset Boulevard Unit 4',
        city: 'Phoenix',
        state: 'AZ',
        zipCode: postalCode,
        fullAddress: `789 Sunset Boulevard Unit 4, Phoenix, AZ ${postalCode}`,
        bedrooms: 2,
        bathrooms: 2,
        squareFeet: 1200,
        yearBuilt: 2020,
        estimatedValueUsd: 195000,
        estimatedValueLow: 185000,
        estimatedValueHigh: 210000,
        photos: this.generatePropertyImages(3, 'CONDO'),
        status: 'sample',
        source: 'sample',
        isSampleData: true
      }
    ];
  }

  async fetchPropertiesByZipCode(params: {
    postalCode: string;
    propertyType?: string;
    orderBy?: string;
    page?: number;
    pageSize?: number;
    minBeds?: number;
    minBaths?: number;
    minValue?: number;
    maxValue?: number;
  }): Promise<{ properties: any[]; total: number; page: number; pageSize: number; usingSampleData?: boolean; apiError?: string }> {
    if (!this.attomApiKey) {
      console.log('ATTOM API key not configured, returning sample data');
      const sampleProps = this.getSampleProperties(params.postalCode);
      return { 
        properties: sampleProps, 
        total: sampleProps.length, 
        page: 1, 
        pageSize: 10,
        usingSampleData: true,
        apiError: 'API key not configured'
      };
    }

    try {
      const queryParams: Record<string, any> = {
        postalcode: params.postalCode,
        orderby: params.orderBy || 'avmvalue desc',
        page: params.page || 1,
        pagesize: params.pageSize || 20
      };

      if (params.propertyType && params.propertyType !== 'ALL') {
        queryParams.propertytype = params.propertyType;
      }
      if (params.minBeds) queryParams.minbeds = params.minBeds;
      if (params.minBaths) queryParams.minbaths = params.minBaths;
      if (params.minValue) queryParams.minavmvalue = params.minValue;
      if (params.maxValue) queryParams.maxavmvalue = params.maxValue;

      const response = await this.retryRequest(() => 
        axios.get(
          `${this.attomBaseUrl}/propertyapi/v1.0.0/attomavm/detail`,
          {
            headers: {
              'Accept': 'application/json',
              'apikey': this.attomApiKey
            },
            params: queryParams,
            timeout: this.requestTimeout
          }
        )
      );

      if (response.data?.status?.code === 0 && response.data?.property) {
        const properties = response.data.property.map((prop: any) => {
          const building = prop.building || {};
          const rooms = building.rooms || {};
          const size = building.size || {};
          const avm = prop.avm || {};
          const avmAmount = avm.amount || {};
          const sale = prop.sale || {};
          const saleAmount = sale.amount || {};
          const lot = prop.lot || {};
          const address = prop.address || {};
          const location = prop.location || {};
          const summary = prop.summary || {};
          const assessment = prop.assessment || {};

          const propertyImageIndex = (prop.identifier?.attomId || 0) % 10;

          return {
            attomId: prop.identifier?.attomId,
            obPropId: prop.identifier?.Id,
            propertyName: address.line1 || 'Property',
            propertyType: this.mapATTOMPropertyType(summary.proptype),
            propertyTypeDisplay: summary.propertyType || summary.proptype || 'Single Family',
            addressLine1: address.line1,
            city: address.locality,
            state: address.countrySubd,
            zipCode: address.postal1,
            fullAddress: address.oneLine,
            latitude: location.latitude ? parseFloat(location.latitude) : null,
            longitude: location.longitude ? parseFloat(location.longitude) : null,
            bedrooms: rooms.beds,
            bathrooms: rooms.bathstotal,
            squareFeet: size.universalsize || size.livingsize || size.bldgsize,
            lotSizeSqFt: lot.lotsize2 || (lot.lotsize1 ? Math.round(lot.lotsize1 * 43560) : null),
            yearBuilt: summary.yearbuilt,
            stories: building.summary?.levels,
            totalRooms: rooms.roomsTotal,
            heatingType: prop.utilities?.heatingtype,
            estimatedValueUsd: avmAmount.value,
            estimatedValueLow: avmAmount.low,
            estimatedValueHigh: avmAmount.high,
            avmConfidence: avmAmount.scr,
            avmDate: avm.eventDate,
            lastSalePrice: saleAmount.saleamt,
            lastSaleDate: saleAmount.salerecdate || sale.saleTransDate,
            pricePerSqFt: sale.calculation?.pricepersizeunit || (avmAmount.value && size.universalsize ? Math.round(avmAmount.value / size.universalsize) : null),
            assessedValue: assessment.assessed?.assdttlvalue,
            ownerOccupied: summary.absenteeInd === 'OWNER OCCUPIED',
            ownerName: prop.owner?.owner1?.fullname,
            photos: this.generatePropertyImages(propertyImageIndex, summary.proptype),
            status: 'available',
            source: 'attom'
          };
        });

        return {
          properties,
          total: response.data.status?.total || properties.length,
          page: response.data.status?.page || 1,
          pageSize: response.data.status?.pagesize || 20
        };
      }

      if (response.data?.status?.code === 400 && response.data?.status?.msg === 'SuccessWithoutResult') {
        return { properties: [], total: 0, page: 1, pageSize: params.pageSize || 20 };
      }

      console.log('ATTOM property list error:', response.data);
      const sampleProps = this.getSampleProperties(params.postalCode);
      return { 
        properties: sampleProps, 
        total: sampleProps.length, 
        page: 1, 
        pageSize: 10,
        usingSampleData: true,
        apiError: 'ATTOM API returned an error'
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.Response?.status?.msg || error.message || 'Unknown error';
      console.error('ATTOM property list error:', errorMsg);
      const sampleProps = this.getSampleProperties(params.postalCode);
      return { 
        properties: sampleProps, 
        total: sampleProps.length, 
        page: 1, 
        pageSize: 10,
        usingSampleData: true,
        apiError: `ATTOM API unavailable: ${errorMsg}`
      };
    }
  }

  private generatePropertyImages(seed: number, propType?: string): string[] {
    const baseUrl = 'https://images.unsplash.com';
    const propertyImages = [
      '/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
      '/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
      '/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
      '/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
      '/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
      '/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
      '/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
      '/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop',
      '/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop',
      '/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop',
      '/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
      '/photo-1599427303058-f04cbcf4756f?w=800&h=600&fit=crop'
    ];

    const condoImages = [
      '/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
      '/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
      '/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      '/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'
    ];

    const commercialImages = [
      '/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop',
      '/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
      '/photo-1554469384-e58fac16e23a?w=800&h=600&fit=crop'
    ];

    const landImages = [
      '/photo-1500382017468-9049fed747ef?w=800&h=600&fit=crop',
      '/photo-1501854140801-50d01698950b?w=800&h=600&fit=crop',
      '/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop'
    ];

    let imageSet = propertyImages;
    if (propType) {
      const type = propType.toUpperCase();
      if (type.includes('CONDO') || type.includes('APARTMENT')) {
        imageSet = condoImages;
      } else if (type.includes('COMMERCIAL') || type.includes('OFFICE') || type.includes('RETAIL')) {
        imageSet = commercialImages;
      } else if (type.includes('LAND') || type.includes('VACANT') || type.includes('LOT')) {
        imageSet = landImages;
      }
    }

    const mainIndex = seed % imageSet.length;
    const secondIndex = (seed + 3) % imageSet.length;
    const thirdIndex = (seed + 7) % imageSet.length;

    return [
      `${baseUrl}${imageSet[mainIndex]}`,
      `${baseUrl}${imageSet[secondIndex]}`,
      `${baseUrl}${imageSet[thirdIndex]}`
    ];
  }

  async fetchPropertiesByCity(params: {
    city: string;
    state: string;
    propertyType?: string;
    minBeds?: number;
    minBaths?: number;
    minValue?: number;
    maxValue?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ properties: any[]; total: number }> {
    if (!this.attomApiKey) {
      console.log('ATTOM API key not configured');
      return { properties: [], total: 0 };
    }

    try {
      const response = await axios.get(
        `${this.attomBaseUrl}/propertyapi/v1.0.0/property/snapshot`,
        {
          headers: {
            'Accept': 'application/json',
            'apikey': this.attomApiKey
          },
          params: {
            cityname: params.city,
            statecode: params.state,
            propertytype: params.propertyType || 'SFR',
            minbeds: params.minBeds,
            minbaths: params.minBaths,
            minavmvalue: params.minValue,
            maxavmvalue: params.maxValue,
            page: params.page || 1,
            pagesize: params.pageSize || 20
          }
        }
      );

      if (response.data?.status?.code === 0 && response.data?.property) {
        const properties = response.data.property.map((prop: ATTOMPropertyListing) => ({
          attomId: prop.identifier?.attomId,
          obPropId: prop.identifier?.obPropId,
          propertyName: prop.address?.line1 || 'Property',
          propertyType: this.mapATTOMPropertyType(prop.summary?.proptype),
          addressLine1: prop.address?.line1,
          city: prop.address?.locality,
          state: prop.address?.countrySubd,
          zipCode: prop.address?.postal1,
          fullAddress: prop.address?.oneLine,
          latitude: prop.location?.latitude ? parseFloat(prop.location.latitude) : null,
          longitude: prop.location?.longitude ? parseFloat(prop.location.longitude) : null,
          bedrooms: prop.building?.rooms?.beds,
          bathrooms: prop.building?.rooms?.bathstotal,
          squareFeet: prop.building?.size?.universalsize,
          yearBuilt: prop.summary?.yearbuilt,
          estimatedValueUsd: prop.avm?.amount?.value,
          status: 'available',
          source: 'attom'
        }));

        return {
          properties,
          total: response.data.status?.total || properties.length
        };
      }

      return { properties: [], total: 0 };
    } catch (error: any) {
      console.error('ATTOM city search error:', error.response?.data || error.message);
      return { properties: [], total: 0 };
    }
  }

  private mapATTOMPropertyType(attomType?: string): string {
    const typeMap: Record<string, string> = {
      'SFR': 'single_family',
      'CONDOMINIUM': 'condo',
      'TOWNHOUSE/ROWHOUSE': 'townhouse',
      'DUPLEX': 'multi_family',
      'TRIPLEX': 'multi_family',
      'MULTI FAMILY DWELLING': 'multi_family',
      'APARTMENT': 'multi_family',
      'VACANT LAND (NEC)': 'land',
      'RESIDENTIAL LOT': 'land',
      'RESIDENTIAL ACREAGE': 'land',
      'COMMERCIAL (NEC)': 'commercial',
      'COMMERCIAL BUILDING': 'commercial',
      'OFFICE BUILDING': 'commercial',
      'RETAIL TRADE': 'commercial'
    };
    return typeMap[attomType || ''] || 'single_family';
  }

  async fetchFromATTOM(address: PropertyAddress): Promise<ATTOMPropertyData | null> {
    if (!this.attomApiKey) {
      console.log('ATTOM API key not configured');
      return null;
    }

    try {
      const fullAddress = `${address.addressLine1}, ${address.city}, ${address.state} ${address.zipCode}`;
      
      const snapshotResponse = await axios.get(
        `${this.attomBaseUrl}/propertyapi/v1.0.0/property/snapshot`,
        {
          headers: {
            'Accept': 'application/json',
            'apikey': this.attomApiKey
          },
          params: {
            address1: address.addressLine1,
            address2: `${address.city}, ${address.state} ${address.zipCode}`
          }
        }
      );

      if (snapshotResponse.data?.property?.[0]) {
        const prop = snapshotResponse.data.property[0];
        const obPropId = prop.identifier?.obPropId;
        
        let detailData = prop;
        if (obPropId) {
          try {
            const detailResponse = await axios.get(
              `${this.attomBaseUrl}/propertyapi/v1.0.0/property/detail`,
              {
                headers: {
                  'Accept': 'application/json',
                  'apikey': this.attomApiKey
                },
                params: { ID: obPropId }
              }
            );
            if (detailResponse.data?.property?.[0]) {
              detailData = detailResponse.data.property[0];
            }
          } catch (detailError) {
            console.log('ATTOM detail fetch failed, using snapshot data');
          }
        }

        const building = detailData.building || {};
        const lot = detailData.lot || {};
        const summary = detailData.summary || {};
        const addressData = detailData.address || {};
        const location = detailData.location || {};

        return {
          attomId: detailData.identifier?.attomId?.toString(),
          estimatedValue: undefined,
          lastSalePrice: undefined,
          lastSaleDate: undefined,
          taxAssessedValue: undefined,
          yearBuilt: building.summary?.yearbuilt || summary.yearbuilt,
          lotSizeSqFt: lot.lotsize2 || (lot.lotSize1 ? lot.lotSize1 * 43560 : undefined),
          livingAreaSqFt: building.size?.livingsize || building.size?.universalsize,
          bedrooms: building.rooms?.beds,
          bathrooms: building.rooms?.bathstotal,
          propertyType: summary.proptype || summary.propsubtype,
          zoning: undefined,
          ownerName: undefined,
          latitude: parseFloat(location.latitude) || undefined,
          longitude: parseFloat(location.longitude) || undefined,
          fipsCode: detailData.identifier?.fips,
          apn: detailData.identifier?.apn,
          photos: [],
          rawData: detailData
        };
      }

      return null;
    } catch (error: any) {
      console.error('ATTOM API error:', error.response?.data || error.message);
      return null;
    }
  }

  async fetchATTOMAssessment(obPropId: string): Promise<{ 
    assessedValue?: number; 
    taxAmount?: number;
    taxYear?: number;
  } | null> {
    if (!this.attomApiKey || !obPropId) return null;

    try {
      const response = await axios.get(
        `${this.attomBaseUrl}/propertyapi/v1.0.0/assessment/detail`,
        {
          headers: {
            'Accept': 'application/json',
            'apikey': this.attomApiKey
          },
          params: { ID: obPropId }
        }
      );

      if (response.data?.property?.[0]?.assessment) {
        const assessment = response.data.property[0].assessment;
        return {
          assessedValue: assessment.assessed?.assdTtlValue,
          taxAmount: assessment.tax?.taxAmt,
          taxYear: assessment.tax?.taxyear
        };
      }
      return null;
    } catch (error: any) {
      console.error('ATTOM assessment error:', error.response?.data || error.message);
      return null;
    }
  }

  async fetchFromRentCast(address: PropertyAddress): Promise<RentCastPropertyData | null> {
    if (!this.rentcastApiKey) {
      console.log('RentCast API key not configured');
      return null;
    }

    try {
      const response = await axios.get(
        `${this.rentcastBaseUrl}/properties`,
        {
          headers: {
            'X-Api-Key': this.rentcastApiKey
          },
          params: {
            address: address.addressLine1,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
            limit: 1
          }
        }
      );

      if (response.data?.[0]) {
        const prop = response.data[0];

        const rentResponse = await axios.get(
          `${this.rentcastBaseUrl}/avm/rent/long-term`,
          {
            headers: {
              'X-Api-Key': this.rentcastApiKey
            },
            params: {
              address: address.addressLine1,
              city: address.city,
              state: address.state,
              zipCode: address.zipCode
            }
          }
        ).catch(() => ({ data: null }));

        const valueResponse = await axios.get(
          `${this.rentcastBaseUrl}/avm/value`,
          {
            headers: {
              'X-Api-Key': this.rentcastApiKey
            },
            params: {
              address: address.addressLine1,
              city: address.city,
              state: address.state,
              zipCode: address.zipCode
            }
          }
        ).catch(() => ({ data: null }));

        return {
          rentcastId: prop.id,
          estimatedRent: rentResponse.data?.rent || rentResponse.data?.rentLow,
          estimatedValue: valueResponse.data?.price || valueResponse.data?.priceLow,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          squareFootage: prop.squareFootage,
          yearBuilt: prop.yearBuilt,
          propertyType: prop.propertyType,
          hoaFees: prop.hoa?.fee,
          latitude: prop.latitude,
          longitude: prop.longitude,
          photos: prop.photos || [],
          rawData: {
            property: prop,
            rent: rentResponse.data,
            value: valueResponse.data
          }
        };
      }

      return null;
    } catch (error: any) {
      console.error('RentCast API error:', error.response?.data || error.message);
      return null;
    }
  }

  async enrichProperty(address: PropertyAddress): Promise<EnrichedPropertyData> {
    const [attomData, rentcastData] = await Promise.all([
      this.fetchFromATTOM(address),
      this.fetchFromRentCast(address)
    ]);

    const combined = {
      estimatedValueUsd: attomData?.estimatedValue || rentcastData?.estimatedValue,
      estimatedRentUsd: rentcastData?.estimatedRent,
      bedrooms: attomData?.bedrooms || rentcastData?.bedrooms,
      bathrooms: attomData?.bathrooms || rentcastData?.bathrooms,
      squareFeet: attomData?.livingAreaSqFt || rentcastData?.squareFootage,
      yearBuilt: attomData?.yearBuilt || rentcastData?.yearBuilt,
      propertyType: attomData?.propertyType || rentcastData?.propertyType,
      latitude: attomData?.latitude || rentcastData?.latitude,
      longitude: attomData?.longitude || rentcastData?.longitude,
      photos: [...(rentcastData?.photos || []), ...(attomData?.photos || [])]
    };

    return {
      attom: attomData || undefined,
      rentcast: rentcastData || undefined,
      combined
    };
  }

  async fetchRentEstimate(params: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
  }): Promise<{
    rent: number | null;
    rentRangeLow: number | null;
    rentRangeHigh: number | null;
    comparablesCount: number;
    source: string;
  }> {
    if (!this.rentcastApiKey) {
      console.log('RentCast API key not configured');
      return { rent: null, rentRangeLow: null, rentRangeHigh: null, comparablesCount: 0, source: 'estimate' };
    }

    try {
      const fullAddress = `${params.address}, ${params.city}, ${params.state} ${params.zipCode}`;
      
      const queryParams: Record<string, any> = {
        address: fullAddress,
        compCount: 10,
        maxRadius: 5,
        daysOld: 180
      };

      if (params.propertyType) {
        const typeMap: Record<string, string> = {
          'single_family': 'Single Family',
          'condo': 'Condo',
          'townhouse': 'Townhouse',
          'multi_family': 'Multi-Family',
          'apartment': 'Apartment'
        };
        queryParams.propertyType = typeMap[params.propertyType] || params.propertyType;
      }
      if (params.bedrooms) queryParams.bedrooms = params.bedrooms;
      if (params.bathrooms) queryParams.bathrooms = params.bathrooms;
      if (params.squareFootage) queryParams.squareFootage = params.squareFootage;

      const response = await axios.get(
        `${this.rentcastBaseUrl}/avm/rent/long-term`,
        {
          headers: {
            'X-Api-Key': this.rentcastApiKey
          },
          params: queryParams
        }
      );

      if (response.data) {
        return {
          rent: response.data.rent || null,
          rentRangeLow: response.data.rentRangeLow || null,
          rentRangeHigh: response.data.rentRangeHigh || null,
          comparablesCount: response.data.comparables?.length || 0,
          source: 'rentcast'
        };
      }

      return { rent: null, rentRangeLow: null, rentRangeHigh: null, comparablesCount: 0, source: 'estimate' };
    } catch (error: any) {
      console.error('RentCast rent estimate error:', error.response?.data || error.message);
      return { rent: null, rentRangeLow: null, rentRangeHigh: null, comparablesCount: 0, source: 'estimate' };
    }
  }

  async batchFetchRentEstimates(properties: Array<{
    address: string;
    city: string;
    state: string;
    zipCode: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
  }>): Promise<Map<string, {
    rent: number | null;
    rentRangeLow: number | null;
    rentRangeHigh: number | null;
    comparablesCount: number;
    source: string;
  }>> {
    const results = new Map();
    
    const batchSize = 5;
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (prop) => {
          const key = `${prop.address}, ${prop.city}, ${prop.state}`;
          const estimate = await this.fetchRentEstimate(prop);
          return { key, estimate };
        })
      );
      
      batchResults.forEach(({ key, estimate }) => {
        results.set(key, estimate);
      });
      
      if (i + batchSize < properties.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  }

  async searchProperties(params: {
    city?: string;
    state?: string;
    zipCode?: string;
    propertyType?: string;
    minBeds?: number;
    maxPrice?: number;
    limit?: number;
  }): Promise<any[]> {
    if (!this.rentcastApiKey) {
      console.log('RentCast API key not configured for search');
      return [];
    }

    try {
      const response = await axios.get(
        `${this.rentcastBaseUrl}/listings/sale`,
        {
          headers: {
            'X-Api-Key': this.rentcastApiKey
          },
          params: {
            city: params.city,
            state: params.state,
            zipCode: params.zipCode,
            propertyType: params.propertyType,
            bedrooms: params.minBeds,
            maxPrice: params.maxPrice,
            limit: params.limit || 20,
            status: 'active'
          }
        }
      );

      return response.data || [];
    } catch (error: any) {
      console.error('RentCast search error:', error.response?.data || error.message);
      return [];
    }
  }

  async getPropertyValuation(address: PropertyAddress): Promise<{
    estimatedValue?: number;
    estimatedRent?: number;
    confidence?: string;
  }> {
    const enriched = await this.enrichProperty(address);
    
    return {
      estimatedValue: enriched.combined.estimatedValueUsd,
      estimatedRent: enriched.combined.estimatedRentUsd,
      confidence: enriched.attom && enriched.rentcast ? 'high' : 
                  enriched.attom || enriched.rentcast ? 'medium' : 'low'
    };
  }

  async fetchWalkScore(params: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
  }): Promise<WalkScoreData> {
    const defaultResult: WalkScoreData = {
      walkScore: null,
      walkDescription: null,
      transitScore: null,
      transitDescription: null,
      bikeScore: null,
      bikeDescription: null
    };

    if (!this.walkScoreApiKey) {
      return defaultResult;
    }

    try {
      const fullAddress = `${params.address} ${params.city} ${params.state} ${params.zipCode}`;
      
      const queryParams: Record<string, any> = {
        format: 'json',
        address: fullAddress,
        wsapikey: this.walkScoreApiKey,
        transit: 1,
        bike: 1
      };

      if (params.latitude && params.longitude) {
        queryParams.lat = params.latitude;
        queryParams.lon = params.longitude;
      }

      const response = await axios.get(
        `${this.walkScoreBaseUrl}/score`,
        { params: queryParams }
      );

      if (response.data && response.data.status === 1) {
        return {
          walkScore: response.data.walkscore || null,
          walkDescription: response.data.description || null,
          transitScore: response.data.transit?.score || null,
          transitDescription: response.data.transit?.description || null,
          bikeScore: response.data.bike?.score || null,
          bikeDescription: response.data.bike?.description || null
        };
      }

      return defaultResult;
    } catch (error: any) {
      console.error('Walk Score API error:', error.response?.data || error.message);
      return defaultResult;
    }
  }

  async batchFetchWalkScores(properties: Array<{
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
  }>): Promise<Map<string, WalkScoreData>> {
    const results = new Map<string, WalkScoreData>();
    
    const batchSize = 3;
    for (let i = 0; i < Math.min(properties.length, 10); i += batchSize) {
      const batch = properties.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (prop) => {
          const key = `${prop.address}, ${prop.city}, ${prop.state}`;
          const walkData = await this.fetchWalkScore(prop);
          return { key, walkData };
        })
      );
      
      batchResults.forEach(({ key, walkData }) => {
        results.set(key, walkData);
      });
      
      if (i + batchSize < Math.min(properties.length, 10)) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    return results;
  }

  calculateRentToOwnMetrics(params: {
    propertyValue: number;
    monthlyRent: number;
    annualTaxes?: number;
    annualInsurance?: number;
    equityPerPayment?: number;
    downPaymentPercent?: number;
  }): RentToOwnMetrics {
    const {
      propertyValue,
      monthlyRent,
      annualTaxes,
      annualInsurance,
      equityPerPayment = 0.20,
      downPaymentPercent = 0.03
    } = params;

    if (!propertyValue || !monthlyRent) {
      return {
        priceToRentRatio: null,
        monthlyAffordabilityIndex: null,
        breakEvenMonths: null,
        projectedEquityYear1: null,
        projectedEquityYear3: null,
        projectedEquityYear5: null,
        estimatedMonthlyPayment: null,
        estimatedTaxesMonthly: null,
        estimatedInsuranceMonthly: null,
        totalMonthlyOwnership: null,
        capRate: null,
        cashOnCashReturn: null
      };
    }

    const annualRent = monthlyRent * 12;
    const priceToRentRatio = Math.round((propertyValue / annualRent) * 10) / 10;
    
    const medianHouseholdIncome = 75000;
    const monthlyAffordabilityIndex = Math.round((monthlyRent / (medianHouseholdIncome / 12)) * 100);
    
    const equityPerMonth = monthlyRent * equityPerPayment;
    const totalEquityNeeded = propertyValue * (1 - downPaymentPercent);
    const breakEvenMonths = Math.ceil(totalEquityNeeded / equityPerMonth);
    
    const projectedEquityYear1 = Math.round(equityPerMonth * 12);
    const projectedEquityYear3 = Math.round(equityPerMonth * 36);
    const projectedEquityYear5 = Math.round(equityPerMonth * 60);
    
    const estimatedTaxesMonthly = annualTaxes ? Math.round(annualTaxes / 12) : Math.round(propertyValue * 0.012 / 12);
    const estimatedInsuranceMonthly = annualInsurance ? Math.round(annualInsurance / 12) : Math.round(propertyValue * 0.005 / 12);
    
    const estimatedMonthlyPayment = monthlyRent;
    const totalMonthlyOwnership = estimatedMonthlyPayment + estimatedTaxesMonthly + estimatedInsuranceMonthly;
    
    const annualExpenses = (estimatedTaxesMonthly + estimatedInsuranceMonthly) * 12 + (propertyValue * 0.01);
    const netOperatingIncome = annualRent - annualExpenses;
    const capRate = Math.round((netOperatingIncome / propertyValue) * 1000) / 10;
    
    const downPayment = propertyValue * downPaymentPercent;
    const annualCashFlow = netOperatingIncome - (monthlyRent * 12 * 0.15);
    const cashOnCashReturn = Math.round((annualCashFlow / downPayment) * 1000) / 10;

    return {
      priceToRentRatio,
      monthlyAffordabilityIndex,
      breakEvenMonths,
      projectedEquityYear1,
      projectedEquityYear3,
      projectedEquityYear5,
      estimatedMonthlyPayment,
      estimatedTaxesMonthly,
      estimatedInsuranceMonthly,
      totalMonthlyOwnership,
      capRate: Math.max(0, capRate),
      cashOnCashReturn: Math.max(0, cashOnCashReturn)
    };
  }

  async fetchATTOMSalesHistory(attomId: string): Promise<Array<{
    saleDate: string;
    salePrice: number;
    buyerName?: string;
    sellerName?: string;
    transactionType?: string;
  }>> {
    if (!this.attomApiKey || !attomId) return [];

    try {
      const response = await axios.get(
        `${this.attomBaseUrl}/propertyapi/v1.0.0/saleshistory/detail`,
        {
          headers: {
            'Accept': 'application/json',
            'apikey': this.attomApiKey
          },
          params: { attomid: attomId }
        }
      );

      if (response.data?.property?.[0]?.saleHistory) {
        return response.data.property[0].saleHistory.map((sale: any) => ({
          saleDate: sale.saleTransDate || sale.recordingDate,
          salePrice: sale.saleAmt || sale.amount?.saleAmt,
          buyerName: sale.buyerName,
          sellerName: sale.sellerName,
          transactionType: sale.saleTransType
        })).filter((s: any) => s.salePrice && s.saleDate);
      }
      return [];
    } catch (error: any) {
      console.error('ATTOM sales history error:', error.response?.data || error.message);
      return [];
    }
  }

  async fetchATTOMTaxHistory(attomId: string): Promise<Array<{
    taxYear: number;
    taxAmount: number;
    assessedValue?: number;
    marketValue?: number;
  }>> {
    if (!this.attomApiKey || !attomId) return [];

    try {
      const response = await axios.get(
        `${this.attomBaseUrl}/propertyapi/v1.0.0/assessment/detail`,
        {
          headers: {
            'Accept': 'application/json',
            'apikey': this.attomApiKey
          },
          params: { attomid: attomId }
        }
      );

      if (response.data?.property?.[0]?.assessment) {
        const assessment = response.data.property[0].assessment;
        const taxHistory = [];
        
        if (assessment.tax) {
          taxHistory.push({
            taxYear: assessment.tax.taxyear || new Date().getFullYear(),
            taxAmount: assessment.tax.taxAmt || 0,
            assessedValue: assessment.assessed?.assdTtlValue,
            marketValue: assessment.market?.mktTtlValue
          });
        }
        
        return taxHistory;
      }
      return [];
    } catch (error: any) {
      console.error('ATTOM tax history error:', error.response?.data || error.message);
      return [];
    }
  }

  async fetchATTOMSchoolData(latitude: number, longitude: number): Promise<Array<{
    schoolName: string;
    schoolType: string;
    gradeRange: string;
    distance: number;
    rating?: number;
  }>> {
    if (!this.attomApiKey || !latitude || !longitude) return [];

    try {
      const response = await axios.get(
        `${this.attomBaseUrl}/propertyapi/v1.0.0/school/snapshot`,
        {
          headers: {
            'Accept': 'application/json',
            'apikey': this.attomApiKey
          },
          params: {
            latitude,
            longitude,
            radius: 3,
            filetypetext: 'PUBLIC'
          }
        }
      );

      if (response.data?.school) {
        return response.data.school.slice(0, 5).map((school: any) => ({
          schoolName: school.InstitutionName || school.schoolName,
          schoolType: school.SchoolType || school.filetypetext || 'Public',
          gradeRange: school.gradeRange || `${school.Gradelow || 'K'}-${school.Gradehigh || '12'}`,
          distance: school.distance || 0,
          rating: school.gsRating || school.rating
        }));
      }
      return [];
    } catch (error: any) {
      console.error('ATTOM school data error:', error.response?.data || error.message);
      return [];
    }
  }

  isConfigured(): { attom: boolean; rentcast: boolean; walkScore: boolean } {
    return {
      attom: !!this.attomApiKey,
      rentcast: !!this.rentcastApiKey,
      walkScore: !!this.walkScoreApiKey
    };
  }
}

export const propertyDataService = new PropertyDataService();
export default PropertyDataService;
