export type TransactionType = 'contribution' | 'expense' | 'payment';
export type TransactionStatus = 'pending' | 'verified' | 'rejected';

export interface PaymentChannel {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  paymentChannelId?: string;
  userId?: string;
  description?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceSummary {
  totalContributions: number;
  totalExpenses: number;
  balance: number;
  currency: string;
}

export interface CreateTransactionDto {
  type: TransactionType;
  amount: number;
  currency: string;
  paymentChannelId?: string;
  description?: string;
  receiptUrl?: string;
}

export interface CreatePaymentChannelDto {
  name: string;
  description?: string;
  isActive: boolean;
}
