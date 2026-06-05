import React from "react";
import CategoryManager from "@/components/categories/CategoryManager";

export const metadata = {
  title: "Payment Categories | GurSewa Online",
  description: "Manage expense categories and ledger heads",
};

export default function PaymentCategoriesPage() {
  return <CategoryManager type="PAYMENT" />;
}
