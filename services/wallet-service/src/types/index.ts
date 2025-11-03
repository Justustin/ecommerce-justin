export interface CreditTransactionDTO {
    userId: string;
    amount: number;
    type: 'cashback' | 'deposit' | 'refund';
    description: string;
    referenceId?: string;
    referenceType?: string;
}

export interface WithdrawalRequestDTO {
    userId: string;
    amount: number;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
}