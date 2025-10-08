import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Payment Service API',
      version: '1.0.0',
      description: `Payment processing and refund management service for Pinduoduo clone.
      
**Features:**
- Xendit payment gateway integration
- Escrow management for group buying
- Automated refund processing
- Transaction ledger tracking
- Phone-only authentication support

**Base URL:** \`http://localhost:3006\``,
      contact: {
        name: 'API Support',
        email: 'support@pinduoduo.id'
      }
    },
    servers: [
      {
        url: 'http://localhost:3006',
        description: 'Development server'
      },
      {
        url: 'https://api.pinduoduo.id',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Payments',
        description: 'Payment creation and management'
      },
      {
        name: 'Refunds',
        description: 'Refund operations'
      },
      {
        name: 'Escrow',
        description: 'Escrow management for group buying'
      },
      {
        name: 'Webhooks',
        description: 'Xendit webhook callbacks'
      },
      {
        name: 'Health',
        description: 'Service health check'
      }
    ],
    components: {
      securitySchemes: {
        XenditCallback: {
          type: 'apiKey',
          in: 'header',
          name: 'x-callback-token',
          description: 'Xendit callback verification token'
        }
      },
      schemas: {
        CreatePaymentRequest: {
          type: 'object',
          required: ['orderId', 'userId', 'amount', 'paymentMethod'],
          properties: {
            orderId: {
              type: 'string',
              format: 'uuid',
              description: 'Order UUID'
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User UUID'
            },
            amount: {
              type: 'number',
              format: 'decimal',
              minimum: 1,
              description: 'Payment amount in IDR',
              example: 150000
            },
            paymentMethod: {
              type: 'string',
              enum: ['bank_transfer', 'ewallet_ovo', 'ewallet_gopay', 'ewallet_dana'],
              description: 'Payment method'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Payment expiration time (default 24 hours)'
            },
            metadata: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['direct', 'group_buying'],
                  description: 'Order type'
                },
                groupSessionId: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Group session ID (required if type is group_buying)'
                }
              }
            }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            order_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            payment_method: {
              type: 'string',
              enum: ['bank_transfer', 'ewallet_ovo', 'ewallet_gopay', 'ewallet_dana']
            },
            payment_status: {
              type: 'string',
              enum: ['pending', 'processing', 'paid', 'refunded', 'failed', 'expired']
            },
            order_amount: {
              type: 'string',
              description: 'Decimal string',
              example: '150000.00'
            },
            payment_gateway_fee: {
              type: 'string',
              description: 'Decimal string',
              example: '4500.00'
            },
            total_amount: {
              type: 'string',
              description: 'Decimal string',
              example: '150000.00'
            },
            currency: { type: 'string', example: 'IDR' },
            payment_gateway: { type: 'string', example: 'xendit' },
            gateway_transaction_id: { type: 'string', example: '5f4a5b7c8d9e0f1234567890' },
            payment_code: { type: 'string', example: 'PAY-20251006-ABC123' },
            payment_url: {
              type: 'string',
              format: 'uri',
              example: 'https://checkout.xendit.co/web/12345'
            },
            is_in_escrow: { type: 'boolean', example: false },
            escrow_released_at: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            expires_at: { type: 'string', format: 'date-time' },
            paid_at: {
              type: 'string',
              format: 'date-time',
              nullable: true
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        XenditInvoiceCallback: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Xendit invoice ID'
            },
            external_id: {
              type: 'string',
              description: 'Your order reference'
            },
            user_id: {
              type: 'string',
              description: 'Xendit user ID'
            },
            status: {
              type: 'string',
              enum: ['PAID', 'EXPIRED', 'PENDING']
            },
            amount: {
              type: 'number',
              description: 'Invoice amount'
            },
            paid_amount: {
              type: 'number',
              description: 'Amount paid by customer'
            },
            fees_paid_amount: {
              type: 'number',
              description: 'Gateway fees'
            },
            payment_method: {
              type: 'string',
              description: 'Payment method used'
            },
            payment_channel: {
              type: 'string',
              description: 'Specific channel (e.g., BCA, GOPAY)'
            },
            payment_destination: {
              type: 'string',
              description: 'Account/VA number'
            },
            created: {
              type: 'string',
              format: 'date-time'
            },
            updated: {
              type: 'string',
              format: 'date-time'
            },
            paid_at: {
              type: 'string',
              format: 'date-time',
              nullable: true
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Invalid request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Invalid payment method'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Payment not found'
              }
            }
          }
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Failed to create Xendit invoice'
              }
            }
          }
        }
      }
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Check if the payment service is running',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'healthy' },
                      service: { type: 'string', example: 'payment-service' },
                      timestamp: { type: 'string', format: 'date-time' },
                      version: { type: 'string', example: '1.0.0' },
                      environment: { type: 'string', example: 'development' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/payments': {
        post: {
          tags: ['Payments'],
          summary: 'Create a new payment',
          description: `Create a Xendit invoice for an order. Returns a payment URL that the customer can use to complete payment.

**For group buying orders:**
- Payment will be held in escrow until MOQ is reached
- Automatically released when group succeeds
- Automatically refunded if group fails`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreatePaymentRequest' },
                examples: {
                  directPurchase: {
                    summary: 'Direct purchase',
                    value: {
                      orderId: '550e8400-e29b-41d4-a716-446655440000',
                      userId: '660e8400-e29b-41d4-a716-446655440001',
                      amount: 150000,
                      paymentMethod: 'bank_transfer',
                      expiresAt: '2025-10-08T00:00:00Z',
                      metadata: { type: 'direct' }
                    }
                  },
                  groupBuying: {
                    summary: 'Group buying purchase',
                    value: {
                      orderId: '550e8400-e29b-41d4-a716-446655440002',
                      userId: '660e8400-e29b-41d4-a716-446655440001',
                      amount: 135000,
                      paymentMethod: 'ewallet_gopay',
                      expiresAt: '2025-10-08T00:00:00Z',
                      metadata: {
                        type: 'group_buying',
                        groupSessionId: '770e8400-e29b-41d4-a716-446655440003'
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Payment created successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          payment: { $ref: '#/components/schemas/Payment' },
                          paymentUrl: {
                            type: 'string',
                            format: 'uri',
                            example: 'https://checkout.xendit.co/web/12345'
                          },
                          invoiceId: {
                            type: 'string',
                            example: '5f4a5b7c8d9e0f1234567890'
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '500': { $ref: '#/components/responses/InternalError' }
          }
        }
      },
      '/api/payments/order/{orderId}': {
        get: {
          tags: ['Payments'],
          summary: 'Get payment by order ID',
          description: 'Retrieve the most recent payment for an order',
          parameters: [
            {
              name: 'orderId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Order UUID'
            }
          ],
          responses: {
            '200': {
              description: 'Payment found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Payment' }
                    }
                  }
                }
              }
            },
            '404': { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/payments/release-escrow': {
        post: {
          tags: ['Escrow'],
          summary: 'Release escrow for group session',
          description: `**Internal API** - Called by group-buying-service when MOQ is reached.

Releases all escrowed payments for a successful group buying session.`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['groupSessionId'],
                  properties: {
                    groupSessionId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Group buying session UUID'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Escrow released successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Escrow released' },
                      paymentsReleased: { type: 'integer', example: 12 }
                    }
                  }
                }
              }
            },
            '400': { $ref: '#/components/responses/BadRequest' }
          }
        }
      },
      '/api/payments/refund-session': {
        post: {
          tags: ['Refunds'],
          summary: 'Refund all payments in a group session',
          description: `**Internal API** - Called by group-buying-service when MOQ fails.

Automatically refunds all paid orders in a failed group buying session.`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['groupSessionId'],
                  properties: {
                    groupSessionId: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Group buying session UUID'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Refund processing initiated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            paymentId: { type: 'string', format: 'uuid' },
                            status: {
                              type: 'string',
                              enum: ['success', 'failed']
                            },
                            refundId: { type: 'string', format: 'uuid' },
                            error: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': { $ref: '#/components/responses/BadRequest' }
          }
        }
      },
      '/api/payments/eligible-for-settlement': {
        post: {
          tags: ['Payments'],
          summary: 'Get payments eligible for settlement',
          description: `**Internal API** - Called by settlement-service.

Returns all paid, non-escrowed payments within a date range.`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['periodStart', 'periodEnd'],
                  properties: {
                    periodStart: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-09-30T00:00:00Z'
                    },
                    periodEnd: {
                      type: 'string',
                      format: 'date-time',
                      example: '2025-10-07T00:00:00Z'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Eligible payments retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Payment' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/webhooks/xendit/invoice': {
        post: {
          tags: ['Webhooks'],
          summary: 'Xendit invoice webhook',
          description: `Webhook endpoint for Xendit invoice status updates.

**Security:** Requires valid \`x-callback-token\` header.

**Statuses handled:**
- \`PAID\` - Marks payment as paid, updates order status
- \`EXPIRED\` - Marks payment as expired, cancels order`,
          security: [{ XenditCallback: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/XenditInvoiceCallback' },
                example: {
                  id: '5f4a5b7c8d9e0f1234567890',
                  external_id: 'order-550e8400-e29b-41d4-a716-446655440000-1696600000000',
                  user_id: 'xendit-user-id',
                  status: 'PAID',
                  amount: 150000,
                  paid_amount: 150000,
                  fees_paid_amount: 4500,
                  payment_method: 'BANK_TRANSFER',
                  payment_channel: 'BCA',
                  created: '2025-10-06T10:00:00.000Z',
                  updated: '2025-10-06T10:15:00.000Z',
                  paid_at: '2025-10-06T10:15:00.000Z'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Webhook received',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      received: { type: 'boolean', example: true },
                      message: {
                        type: 'string',
                        example: 'Payment processed successfully'
                      }
                    }
                  }
                }
              }
            },
            '403': {
              description: 'Invalid callback token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Invalid callback token' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/webhooks/health': {
        get: {
          tags: ['Webhooks'],
          summary: 'Webhook health check',
          responses: {
            '200': {
              description: 'Webhooks are operational',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'healthy' },
                      service: { type: 'string', example: 'payment-webhooks' },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'] // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);