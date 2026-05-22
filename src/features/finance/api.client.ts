import { apiFetch } from '@/lib/api';
import type {
  Transaction,
  PaymentChannel,
  FinanceSummary,
  CreateTransactionDto,
  CreatePaymentChannelDto,
} from '@/types/finance';

export async function getPaymentChannels(tokenType: 'admin' | 'member' = 'member'): Promise<PaymentChannel[]> {
  return apiFetch<PaymentChannel[]>('GET', '/finance/payment-channels', { tokenType });
}

export async function createPaymentChannel(dto: CreatePaymentChannelDto, tokenType: 'admin' | 'member' = 'admin'): Promise<PaymentChannel> {
  return apiFetch<PaymentChannel>('POST', '/finance/payment-channels', { body: dto, tokenType });
}

export async function updatePaymentChannel(id: string, dto: Partial<CreatePaymentChannelDto>, tokenType: 'admin' | 'member' = 'admin'): Promise<PaymentChannel> {
  return apiFetch<PaymentChannel>('PATCH', `/finance/payment-channels/${id}`, { body: dto, tokenType });
}

export async function deletePaymentChannel(id: string, tokenType: 'admin' | 'member' = 'admin'): Promise<void> {
  return apiFetch<void>('DELETE', `/finance/payment-channels/${id}`, { tokenType });
}

export async function getTransactions(tokenType: 'admin' | 'member' = 'member'): Promise<Transaction[]> {
  return apiFetch<Transaction[]>('GET', '/finance/transactions', { tokenType });
}

export async function createTransaction(dto: CreateTransactionDto, tokenType: 'admin' | 'member' = 'member'): Promise<Transaction> {
  return apiFetch<Transaction>('POST', '/finance/transactions', { body: dto, tokenType });
}

export async function verifyTransaction(id: string, tokenType: 'admin' | 'member' = 'member'): Promise<Transaction> {
  return apiFetch<Transaction>('PATCH', `/finance/transactions/${id}/verify`, { tokenType });
}

export async function getFinanceSummary(year: number = new Date().getFullYear(), tokenType: 'admin' | 'member' = 'member'): Promise<FinanceSummary> {
  return apiFetch<FinanceSummary>('GET', `/finance/summary?year=${year}`, { tokenType });
}
