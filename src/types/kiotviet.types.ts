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

export interface KiotCustomer {
  id: number;
  code: string;
  name: string;
  gender?: boolean;
  birthDate?: string;
  contactNumber?: string;
  address?: string;
  email?: string;
  debt?: number;
  totalInvoiced?: number;
  totalPoint?: number;
  customerGroup?: {
    id: number;
    name: string;
  };
  isActive: boolean;
  modifiedDate: string;
  createdDate: string;
}

