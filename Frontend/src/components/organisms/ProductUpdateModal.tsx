import { Product, productsApi } from "../../services/masterApi";
import { ProductFormModal } from "./ProductFormModal";

export interface ProductUpdateModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onProductSaved: (product: Product) => void | Promise<void>;
  onPrint?: (product: Product) => void;
}

export function ProductUpdateModal({
  isOpen,
  product,
  onClose,
  onProductSaved,
  onPrint,
}: ProductUpdateModalProps) {
  const handleSuccess = async () => {
    if (!product?.id) return;

    const updatedProduct = await productsApi.getById(product.id);
    await onProductSaved(updatedProduct);
  };

  return (
    <ProductFormModal
      isOpen={isOpen}
      onClose={onClose}
      product={product}
      onSuccess={() => void handleSuccess()}
      onPrint={onPrint}
    />
  );
}