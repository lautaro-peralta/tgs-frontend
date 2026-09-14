/**
 * Forma de las estadísticas de ventas que consume la pantalla de ventas
 * (sale.ts calcula estos datos localmente a partir de las ventas cargadas).
 */
export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesByMonth: {
    month: string;
    amount: number;
  }[];
  topProducts: {
    productId: number;
    productName: string;
    quantity: number;
  }[];
  salesByDistributor: {
    distributorName: string;
    totalSales: number;
  }[];
}
