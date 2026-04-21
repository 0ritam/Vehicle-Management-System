export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Component {
  id: number
  name: string
  sku: string
  component_type: "NEW_PART" | "REPAIR_SERVICE"
  unit_price: string
  labor_hours: string
  stock_quantity: number
  repair_alternative: number | null
  is_active: boolean
  created_at: string
}

export interface ComponentListItem {
  id: number
  name: string
  sku: string
  component_type: "NEW_PART" | "REPAIR_SERVICE"
  unit_price: string
  stock_quantity: number
  is_active: boolean
}

export interface Vehicle {
  id: number
  registration_number: string
  make: string
  model: string
  year: number
  owner_name: string
  owner_contact: string
  created_at: string
}

export interface ServiceItem {
  id: number
  component: ComponentListItem
  quantity: number
  unit_price_snapshot: string
  line_total: string
  item_type: "NEW" | "REPAIR"
}

export interface Payment {
  id: number
  amount: string
  method: string
  reference: string
  paid_at: string
}

export interface ServiceOrder {
  id: number
  order_number: string
  vehicle: Vehicle
  issue_description: string
  status: OrderStatus
  labor_rate: string
  tax_rate: string
  discount_amount: string
  subtotal: string
  tax_amount: string
  total: string
  items: ServiceItem[]
  payment: Payment | null
  created_at: string
  completed_at: string | null
}

export type OrderStatus =
  | "DRAFT"
  | "QUOTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PAID"
  | "CANCELLED"

export interface RevenueBucket {
  bucket: string
  revenue: string
  orders: number
}

export interface RevenueSummary {
  total_revenue: string
  order_count: number
  avg_order_value: string
}

export interface CompareOption {
  id: number
  name: string
  sku: string
  component_type: string
  unit_price: string
  labor_hours: string
  stock_quantity: number
}

export interface CompareResponse {
  new_part: CompareOption
  repair_service: CompareOption
  savings_amount: string
  savings_percent: string
}
