import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wallet Service API',
      version: '1.0.0',
      description: 'API for wallet management, credits, and withdrawal processing with batch disbursement via Xendit',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3010',
        description: 'Development server'
      },
      {
        url: 'https://api.yourdomain.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Error message'
            }
          }
        },
        Wallet: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174001'
            },
            balance: {
              type: 'number',
              example: 150000.00,
              description: 'Current wallet balance in IDR'
            },
            total_earned: {
              type: 'number',
              example: 500000.00,
              description: 'Total amount earned (cashback, refunds, etc.)'
            },
            total_spent: {
              type: 'number',
              example: 200000.00,
              description: 'Total amount spent from wallet'
            },
            total_withdrawn: {
              type: 'number',
              example: 150000.00,
              description: 'Total amount withdrawn to bank'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        WalletTransaction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            user_id: {
              type: 'string',
              format: 'uuid'
            },
            amount: {
              type: 'number',
              example: 25000.00,
              description: 'Transaction amount (positive for credit, negative for debit)'
            },
            type: {
              type: 'string',
              enum: ['cashback', 'deposit', 'refund', 'withdrawal'],
              example: 'cashback'
            },
            description: {
              type: 'string',
              example: 'Tier refund from group buying session #12345'
            },
            reference_type: {
              type: 'string',
              example: 'group_session'
            },
            reference_id: {
              type: 'string',
              format: 'uuid'
            },
            balance_before: {
              type: 'number',
              example: 100000.00
            },
            balance_after: {
              type: 'number',
              example: 125000.00
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        WithdrawalRequest: {
          type: 'object',
          required: ['userId', 'amount', 'bankCode', 'bankName', 'accountNumber', 'accountName'],
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174001'
            },
            amount: {
              type: 'number',
              minimum: 10000,
              example: 100000.00,
              description: 'Amount to withdraw (minimum Rp 10,000, includes Rp 2,500 fee)'
            },
            bankCode: {
              type: 'string',
              example: 'BCA',
              description: 'Bank code: BCA, BNI, MANDIRI, BRI, etc.'
            },
            bankName: {
              type: 'string',
              example: 'Bank Central Asia'
            },
            accountNumber: {
              type: 'string',
              example: '1234567890'
            },
            accountName: {
              type: 'string',
              example: 'John Doe'
            }
          }
        },
        Withdrawal: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            user_id: {
              type: 'string',
              format: 'uuid'
            },
            amount: {
              type: 'number',
              example: 100000.00,
              description: 'Total amount requested'
            },
            withdrawal_fee: {
              type: 'number',
              example: 2500.00,
              description: 'Platform fee (Rp 2,500)'
            },
            net_amount: {
              type: 'number',
              example: 97500.00,
              description: 'Amount user receives after fee'
            },
            bank_code: {
              type: 'string',
              example: 'BCA'
            },
            bank_name: {
              type: 'string',
              example: 'Bank Central Asia'
            },
            account_number: {
              type: 'string',
              example: '1234567890'
            },
            account_name: {
              type: 'string',
              example: 'John Doe'
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              example: 'pending',
              description: 'pending: awaiting batch processing, processing: sent to Xendit, completed: money received, failed: refunded to wallet'
            },
            xendit_disbursement_id: {
              type: 'string',
              example: 'disb_abc123xyz'
            },
            requested_at: {
              type: 'string',
              format: 'date-time'
            },
            processed_at: {
              type: 'string',
              format: 'date-time'
            },
            completed_at: {
              type: 'string',
              format: 'date-time'
            },
            failed_reason: {
              type: 'string',
              example: 'Invalid bank account'
            }
          }
        },
        BatchProcessResult: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Batch processing completed'
            },
            processed: {
              type: 'number',
              example: 5,
              description: 'Number of withdrawals successfully sent to Xendit'
            },
            failed: {
              type: 'number',
              example: 1,
              description: 'Number of withdrawals that failed (auto-refunded to wallet)'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  withdrawal_id: {
                    type: 'string',
                    format: 'uuid'
                  },
                  error: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
