// src/templates/notification.templates.ts
import { NotificationType, NotificationTemplate } from '../types';

export class NotificationTemplates {
  /**
   * Get template based on notification type
   */
  getTemplate(type: NotificationType, data: Record<string, any>): NotificationTemplate {
    switch (type) {
      // Payment
      case NotificationType.PAYMENT_SUCCESS:
        return {
          title: '💳 Pembayaran Berhasil',
          message: `Pembayaran Rp ${this.formatCurrency(data.paymentAmount || data.amount || 0)} untuk ${data.productName || 'produk'} berhasil diproses`,
          whatsappMessage: `✅ *Pembayaran Berhasil*\n\nPembayaran sebesar *Rp ${this.formatCurrency(data.paymentAmount || data.amount || 0)}* untuk produk *${data.productName || 'item'}* telah berhasil diproses.\n\nInvoice: ${data.invoiceId || 'Processing'}\n\nTerima kasih!`,
          actionUrl: `/orders/${data.orderId}`,
          icon: '/icons/payment-success.png',
          badge: '/icons/badge.png'
        };

      case NotificationType.PAYMENT_FAILED:
        return {
          title: '❌ Pembayaran Gagal',
          message: `Pembayaran untuk ${data.productName || 'produk'} gagal diproses`,
          whatsappMessage: `❌ *Pembayaran Gagal*\n\nMaaf, pembayaran untuk *${data.productName || 'produk'}* gagal diproses.\n\nSilakan coba lagi atau hubungi customer service kami.`,
          actionUrl: `/payment/${data.paymentId}`,
          icon: '/icons/payment-failed.png'
        };

      // Group Buying
      case NotificationType.MOQ_REACHED:
        return {
          title: '🎉 MOQ Tercapai!',
          message: `Sesi group buying ${data.sessionCode} telah mencapai target minimum!`,
          whatsappMessage: `🎉 *MOQ Tercapai!*\n\nSelamat! Sesi group buying untuk *${data.productName}* (Kode: ${data.sessionCode}) telah mencapai target minimum ${data.targetMoq} peserta.\n\n✅ Total Peserta: ${data.participantCount}\n💰 Total Revenue: Rp ${this.formatCurrency(data.totalRevenue)}\n\nProses produksi akan segera dimulai!`,
          actionUrl: `/group-sessions/${data.sessionId}`,
          icon: '/icons/success.png'
        };

      case NotificationType.GROUP_CONFIRMED:
        return {
          title: '✅ Grup Terkonfirmasi',
          message: `Pesanan Anda di sesi ${data.sessionCode} dikonfirmasi. Produksi akan segera dimulai!`,
          whatsappMessage: `✅ *Grup Terkonfirmasi*\n\nPesanan Anda untuk *${data.productName}* di sesi ${data.sessionCode} telah dikonfirmasi!\n\n📦 Produksi akan dimulai segera\n📅 Estimasi selesai: ${data.estimatedCompletion}\n\nKami akan memberitahu Anda saat produk siap dikirim.`,
          actionUrl: `/group-sessions/${data.sessionId}`,
          icon: '/icons/confirmed.png'
        };

      case NotificationType.GROUP_FAILED:
        return {
          title: '😔 Grup Gagal',
          message: `Sesi ${data.sessionCode} tidak mencapai target. Dana akan dikembalikan`,
          whatsappMessage: `😔 *Grup Gagal*\n\nMaaf, sesi group buying untuk *${data.productName}* (Kode: ${data.sessionCode}) tidak mencapai target minimum.\n\n👥 Peserta: ${data.participantCount}/${data.targetMoq}\n💸 Dana Anda sebesar Rp ${this.formatCurrency(data.amount)} akan dikembalikan dalam 3-5 hari kerja.\n\nTerima kasih atas partisipasinya!`,
          actionUrl: `/group-sessions/${data.sessionId}`,
          icon: '/icons/failed.png'
        };

      case NotificationType.GROUP_EXPIRING:
        return {
          title: '⏰ Waktu Hampir Habis',
          message: `Sesi ${data.sessionCode} akan berakhir dalam ${data.hoursLeft} jam`,
          whatsappMessage: `⏰ *Waktu Hampir Habis!*\n\nSesi group buying untuk *${data.productName}* akan berakhir dalam *${data.hoursLeft} jam*!\n\n👥 Peserta saat ini: ${data.currentParticipants}/${data.targetMoq}\n💰 Harga grup: Rp ${this.formatCurrency(data.groupPrice)}\n\nBuruan join sebelum terlambat!`,
          actionUrl: `/group-sessions/${data.sessionId}`,
          icon: '/icons/alarm.png'
        };

      // Production
      case NotificationType.PRODUCTION_STARTED:
        return {
          title: '🏭 Produksi Dimulai',
          message: `Pabrik ${data.factoryName || 'kami'} telah memulai produksi pesanan Anda`,
          whatsappMessage: `🏭 *Produksi Dimulai*\n\nKabar baik! Pabrik *${data.factoryName || 'kami'}* telah memulai produksi untuk pesanan *${data.productName}* Anda.\n\n📅 Estimasi selesai: ${data.estimatedDelivery || 'Segera'}\n\nKami akan memberitahu Anda saat produk siap dikirim.`,
          actionUrl: `/orders/${data.orderId}`,
          icon: '/icons/factory.png'
        };

      case NotificationType.PRODUCTION_COMPLETED:
        return {
          title: '✅ Produksi Selesai',
          message: `Produk ${data.productName} sudah selesai diproduksi dan siap dikirim`,
          whatsappMessage: `✅ *Produksi Selesai*\n\nProduk *${data.productName}* Anda telah selesai diproduksi!\n\n📦 Status: Siap untuk pengiriman\n🚚 Pengiriman akan dilakukan segera\n\nTerima kasih atas kesabaran Anda!`,
          actionUrl: `/orders/${data.orderId}`,
          icon: '/icons/completed.png'
        };

      // Order & Shipping
      case NotificationType.ORDER_CREATED:
        return {
          title: '📦 Pesanan Dibuat',
          message: `Pesanan #${data.orderNumber} berhasil dibuat`,
          whatsappMessage: `📦 *Pesanan Berhasil Dibuat*\n\nPesanan Anda berhasil dibuat!\n\n🔖 No. Pesanan: #${data.orderNumber}\n💰 Total: Rp ${this.formatCurrency(data.totalAmount || 0)}\n\nLihat detail pesanan Anda di aplikasi.`,
          actionUrl: `/orders/${data.orderId}`,
          icon: '/icons/order.png'
        };

      // ✅ FIXED: Ready for COURIER pickup (not customer!)
      case NotificationType.READY_FOR_PICKUP:
        return {
          title: '📦 Pesanan Siap Dikirim',
          message: `Pesanan Anda siap untuk diambil kurir`,
          whatsappMessage: `📦 *Pesanan Siap Dikirim*\n\nPesanan *${data.productName}* Anda sudah siap!\n\n🚚 Kurir ${data.courierName || 'akan'} segera mengambil paket dari pabrik *${data.factoryName}*.\n\nKami akan update Anda begitu paket sudah diambil kurir.`,
          actionUrl: `/orders/${data.orderId}`,
          icon: '/icons/pickup.png'
        };

      // ✅ FIXED: Picked up BY COURIER
      case NotificationType.PICKED_UP:
        return {
          title: '🚚 Paket Diambil Kurir',
          message: `Paket Anda telah diambil oleh kurir`,
          whatsappMessage: `🚚 *Paket Sudah Diambil Kurir!*\n\nPaket pesanan *${data.productName}* Anda sudah diambil oleh ${data.courierName}!\n\n📦 No. Resi: *${data.trackingNumber || 'N/A'}*\n📍 Estimasi tiba: ${data.estimatedDelivery || 'Segera'}\n\nTrack paket Anda: ${data.trackingUrl || ''}`,
          actionUrl: `/orders/${data.orderId}/tracking`,
          icon: '/icons/courier.png'
        };

      case NotificationType.SHIPPED:
        return {
          title: '📮 Paket Dikirim',
          message: `Paket Anda sedang dalam perjalanan`,
          whatsappMessage: `🛣️ *Paket Dalam Perjalanan*\n\nPaket Anda sedang dalam perjalanan ke alamat tujuan!\n\n📦 No. Resi: *${data.trackingNumber || 'N/A'}*\n🚚 Kurir: ${data.courierName || data.courierService || 'N/A'}\n📍 Estimasi tiba: ${data.estimatedDelivery || 'Segera'}\n\nTrack: ${data.trackingUrl || ''}`,
          actionUrl: `/orders/${data.orderId}/tracking`,
          icon: '/icons/shipped.png'
        };

      case NotificationType.OUT_FOR_DELIVERY:
        return {
          title: '🚗 Dalam Pengiriman',
          message: `Paket Anda akan tiba hari ini`,
          whatsappMessage: `🚗 *Paket Dalam Pengiriman*\n\nPaket *${data.productName}* sedang dalam pengiriman ke alamat Anda!\n\n📦 No. Resi: ${data.trackingNumber}\n🚚 Kurir: ${data.courierName}\n📍 Estimasi tiba: Hari ini, ${data.estimatedTime}\n\nHarap pastikan ada yang menerima paket.`,
          actionUrl: `/orders/${data.orderId}/tracking`,
          icon: '/icons/delivery.png'
        };

      case NotificationType.DELIVERED:
        return {
          title: '✅ Paket Diterima',
          message: `Paket Anda telah diterima`,
          whatsappMessage: `🎉 *Paket Sudah Sampai!*\n\nPesanan *${data.productName}* Anda sudah tiba di alamat tujuan.\n\n📦 Diterima oleh: ${data.receivedBy || 'Penerima'}\n📅 Waktu: ${data.deliveryTime || data.deliveredAt || 'Hari ini'}\n\nTerima kasih sudah berbelanja! 🙏`,
          actionUrl: `/orders/${data.orderId}/review`,
          icon: '/icons/delivered.png'
        };

      // Reviews
      case NotificationType.REVIEW_REMINDER:
        return {
          title: '⭐ Berikan Review',
          message: `Bagaimana pengalaman Anda dengan ${data.productName}?`,
          whatsappMessage: `⭐ *Berikan Review*\n\nHalo! Bagaimana pengalaman Anda dengan *${data.productName}*?\n\nBantu pembeli lain dengan berbagi pengalaman Anda. Review Anda sangat berharga!\n\nBerikan review sekarang dan dapatkan poin reward.`,
          actionUrl: `/orders/${data.orderId}/review`,
          icon: '/icons/star.png'
        };

      // Refunds
      case NotificationType.REFUND_INITIATED:
        return {
          title: '💸 Refund Diproses',
          message: `Refund untuk pesanan #${data.orderNumber} sedang diproses`,
          whatsappMessage: `💸 *Refund Diproses*\n\nRefund untuk pesanan *#${data.orderNumber}* sedang diproses.\n\n💰 Jumlah: Rp ${this.formatCurrency(data.refundAmount)}\n📝 Alasan: ${data.reason}\n⏱️ Estimasi: 3-5 hari kerja\n\nDana akan dikembalikan ke metode pembayaran Anda.`,
          actionUrl: `/orders/${data.orderId}`,
          icon: '/icons/refund.png'
        };

      case NotificationType.REFUND_COMPLETED:
        return {
          title: '✅ Refund Selesai',
          message: `Refund Rp ${this.formatCurrency(data.refundAmount)} telah dikembalikan`,
          whatsappMessage: `✅ *Refund Selesai*\n\nRefund untuk pesanan *#${data.orderNumber}* telah berhasil diproses!\n\n💰 Jumlah: Rp ${this.formatCurrency(data.refundAmount)}\n📅 Tanggal: ${data.completedAt}\n\nDana telah dikembalikan ke metode pembayaran Anda.\n\nTerima kasih!`,
          actionUrl: `/orders/${data.orderId}`,
          icon: '/icons/success.png'
        };

      // Cancelled
      case NotificationType.ORDER_CANCELLED:
        return {
          title: '❌ Pesanan Dibatalkan',
          message: `Pesanan #${data.orderNumber} telah dibatalkan`,
          whatsappMessage: `❌ *Pesanan Dibatalkan*\n\nPesanan #${data.orderNumber} telah dibatalkan.\n\nAlasan: ${data.reason || 'Permintaan pelanggan'}\n\nJika ada pertanyaan, hubungi customer service kami.`,
          actionUrl: `/orders/${data.orderId}`,
          icon: '/icons/cancelled.png'
        };

      default:
        return {
          title: 'Notifikasi',
          message: 'Anda memiliki notifikasi baru',
          whatsappMessage: 'Anda memiliki notifikasi baru dari aplikasi.',
          icon: '/icons/notification.png'
        };
    }
  }

  /**
   * Format currency to Indonesian Rupiah
   */
  private formatCurrency(amount: number | string): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '0';
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  }
}