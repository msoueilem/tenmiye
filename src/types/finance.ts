export type TransactionType = 'contribution' | 'donation' | 'expense';
export type TransactionStatus = 'pending' | 'verified' | 'rejected';

export interface PaymentChannel {
  id: string;
  name: string;
  type: 'mobile' | 'cash';
  walletNumber?: string;
  walletOwner?: string;
  requiresScreenshot: boolean;
  requiresReceiver: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  year: number;
  month: number;
  status: TransactionStatus;
  paymentChannelId?: string;
  userId?: string;
  description?: string;
  notes?: string;
  recordedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSummary {
  year: number;
  month: number | null;
  totals: {
    contribution: number;
    donation: number;
    expense: number;
  };
  income: number;
  net: number;
  currency: string;
}

export interface CreateTransactionDto {
  type: TransactionType;
  amount: number;
  date: string;
  paymentChannelId: string;
  userId?: string;
  description?: string;
  notes?: string;
}

export interface CreatePaymentChannelDto {
  name: string;
  type: 'mobile' | 'cash';
  walletNumber?: string;
  walletOwner?: string;
  isActive?: boolean;
}
