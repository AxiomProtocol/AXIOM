import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from './ui/button';

// Load Stripe promise with proper error handling - module scoped to prevent remounts
let stripePromise: Promise<any> | null = null;

const getStripePromise = () => {
  if (!stripePromise) {
    console.log('🔄 Initializing Stripe...');
    stripePromise = fetch('/api/stripe/public-key')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch Stripe public key: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (!data.publicKey) {
          throw new Error('No public key received from server');
        }
        console.log('🔑 Stripe public key received, loading Stripe.js...');
        return loadStripe(data.publicKey);
      })
      .then(stripe => {
        if (!stripe) {
          throw new Error('Stripe.js failed to load. Check Content Security Policy settings.');
        }
        console.log('✅ Stripe.js loaded successfully');
        return stripe;
      })
      .catch(err => {
        console.error('❌ Failed to load Stripe:', err);
        stripePromise = null; // Allow retry
        return null;
      });
  }
  return stripePromise;
};

// Helper function to reset Stripe loading (for retries)
const resetStripe = () => {
  console.log('🔄 Resetting Stripe loading for retry...');
  stripePromise = null;
};

interface PaymentFormProps {
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
  clientSecret: string;
  paymentDetails: {
    baseAmount: number;
    feeAmount: number;
    totalAmount: number;
  } | null;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ amount, onSuccess, onError, onCancel, clientSecret, paymentDetails }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Card element not found');
      setIsProcessing(false);
      return;
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'SWF Portfolio Funding',
          },
        }
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (paymentIntent.status === 'succeeded') {
        onSuccess();
      } else {
        onError('Payment was not completed');
      }
    } catch (error: any) {
      onError(error.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: false,
    disableLink: false,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="min-h-[40px] p-3 border border-gray-300 rounded bg-white">
          <CardElement options={cardElementOptions} />
        </div>
      </div>
      
      {paymentDetails && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
          <strong>Amount to Add:</strong> ${paymentDetails.baseAmount.toFixed(2)} USD<br/>
          <strong>Processing Fee:</strong> ${paymentDetails.feeAmount.toFixed(2)} USD<br/>
          <strong>Total Charge:</strong> ${paymentDetails.totalAmount.toFixed(2)} USD
        </div>
      )}

      <div className="flex space-x-3">
        <Button
          type="submit"
          disabled={!stripe || isProcessing || !clientSecret || !paymentDetails}
          className="flex-1"
        >
          {isProcessing 
            ? 'Processing...' 
            : paymentDetails 
              ? `Pay $${paymentDetails.totalAmount.toFixed(2)}`
              : 'Loading...'
          }
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

interface CardPaymentFormProps {
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
  pathId?: string;
}

const CardPaymentForm: React.FC<CardPaymentFormProps> = ({ amount, onSuccess, onError, onCancel, pathId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentDetails, setPaymentDetails] = useState<{
    baseAmount: number;
    feeAmount: number;
    totalAmount: number;
  } | null>(null);
  
  // Use ref to ensure one-shot payment intent creation
  const hasCreatedIntent = useRef(false);
  const [stripePromise] = useState(() => getStripePromise());

  // Create payment intent once when component mounts
  useEffect(() => {
    if (hasCreatedIntent.current || amount <= 0) return;
    
    const createPaymentIntent = async () => {
      if (hasCreatedIntent.current) return; // Double check
      hasCreatedIntent.current = true;
      
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('auth-token');
        const response = await fetch('/api/stripe/create-wallet-funding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount, pathId })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
        setPaymentDetails({
          baseAmount: data.baseAmount,
          feeAmount: data.feeAmount,
          totalAmount: data.totalAmount
        });
      } catch (error: any) {
        onError(error.message);
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to prevent race conditions
    const timer = setTimeout(createPaymentIntent, 100);
    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once on mount

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-gray-600">Loading payment form...</span>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="text-center p-8 space-y-4">
        <div className="text-red-600">
          <p className="font-medium">Payment system unavailable</p>
          {error && (
            <p className="text-sm mt-2 text-red-500">{error}</p>
          )}
        </div>
        <Button onClick={onCancel}>Close</Button>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm 
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
        clientSecret={clientSecret}
        paymentDetails={paymentDetails}
      />
    </Elements>
  );
};

export default CardPaymentForm;
