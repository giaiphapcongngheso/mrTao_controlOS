export interface KiotProduct {
  createdDate: string;
  tradeMarkName: string;
  tradeMarkId: number;
  id: number;
  retailerId: number;
  code: string;
  name: string;
  fullName: string;
  categoryId: number;
  categoryName: string;
  allowsSale: boolean;
  type: number;
  hasVariants: boolean;
  basePrice: number;
  weight: number;
  conversionValue: number;
  description: string;
  modifiedDate: string;
  isActive: boolean;
  isLotSerialControl: boolean;
  isBatchExpireControl: boolean;
  images: string[];
}
