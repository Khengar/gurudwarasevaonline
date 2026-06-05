import React from "react";
import CategoryManager from "@/components/categories/CategoryManager";

export const metadata = {
  title: "Receipt Categories | GurSewa Online",
  description: "Manage income categories and ledger heads",
};

export default function ReceiptCategoriesPage() {
  return <CategoryManager type="RECEIPT" />;
}
