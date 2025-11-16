import Xendit from 'xendit-node';

const xenditSecretKey = process.env.XENDIT_SECRET_KEY || '';

if (!xenditSecretKey) {
  console.warn('XENDIT_SECRET_KEY not set - wallet withdrawals will not work');
}

export const xenditClient = new Xendit({
  secretKey: xenditSecretKey
});

export const xenditDisbursementClient = xenditClient.Disbursement;
