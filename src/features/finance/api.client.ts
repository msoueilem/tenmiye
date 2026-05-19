import { apiFetch } from '@/lib/api';
import type {
  Transaction,
  PaymentChannel,
  FinanceSummary,
  CreateTransactionDto,
  CreatePaymentChannelDto,
} from '@/types/finance';

export async function getPaymentChannels(): Promise<PaymentChannel[]> {
  return apiFetch<PaymentChannel[]>('GET', '/finance/payment-channels', { tokenType: 'member' });
}

export async function createPaymentChannel(dto: CreatePaymentChannelDto): Promise<PaymentChannel> {
  return apiFetch<PaymentChannel>('POST', '/finance/payment-channels', { body: dto, tokenType: 'admin' });
}

export async function updatePaymentChannel(id: string, dto: Partial<CreatePaymentChannelDto>): Promise<PaymentChannel> {
  return apiFetch<PaymentChannel>('PATCH', `/finance/payment-channels/${id}`, { body: dto, tokenType: 'admin' });
}

export async function deletePaymentChannel(id: string): Promise<void> {
  return apiFetch<void>('DELETE', `/finance/payment-channels/${id}`, { tokenType: 'admin' });
}

export async function getTransactions(): Promise<Transaction[]> {
  return apiFetch<Transaction[]>('GET', '/finance/transactions', { tokenType: 'member' });
}

export async function createTransaction(dto: CreateTransactionDto): Promise<Transaction> {
  return apiFetch<Transaction>('POST', '/finance/transactions', { body: dto, tokenType: 'member' });
}

export async function verifyTransaction(id: string): Promise<Transaction> {
  return apiFetch<Transaction>('PATCH', `/finance/transactions/${id}/verify`, { tokenType: 'member' });
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
  return apiFetch<FinanceSummary>('GET', '/finance/summary', { tokenType: 'member' });
}
