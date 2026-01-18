/**
 * Sample DSL topologies for FlowCanvas
 * Using DSL v2 specification with event, transformation, and node blocks
 */

export type ExampleName = 'payment' | 'mapic' | 'ecommerce' | 'etl';

export const EXAMPLES: Record<ExampleName, string> = {
  // Payment Processing - Full DSL v2 example
  payment: `# Payment Processing System
# Demonstrates DSL v2: events, transformations, nodes with labels

# Event definitions
event OrderCreated {
    label: "Order Created"
    color: "#3b82f6"
    shape: document
    size: medium
}

event PaymentProcessed {
    label: "Payment Processed"
    color: "#10b981"
    shape: package
    size: medium
}

event Notification {
    label: "Notification"
    color: "#f59e0b"
    shape: message
    size: small
}

# Transformation definitions
transformation ProcessPayment {
    label: "Process Payment"
    input: OrderCreated
    output: PaymentProcessed
    delay: 500
}

transformation SendNotification {
    label: "Send Notification"
    input: PaymentProcessed
    output: Notification
    delay: 200
}

# Node definitions
node WebGateway {
    label: "Web Gateway"
    type: external
    position: (0, 100)
}

node OrderAPI {
    label: "Order API"
    type: service
    position: (200, 100)
}

node PaymentSvc {
    label: "Payment Service"
    type: service
    position: (400, 100)
    transformation: ProcessPayment
}

node NotifySvc {
    label: "Notification Service"
    type: service
    position: (600, 100)
    transformation: SendNotification
}

node OrdersDB {
    label: "Orders Database"
    type: db
    position: (400, 250)
    delay: 300
}

node UserInbox {
    label: "User Inbox"
    type: topic
    position: (800, 100)
}

# Subsystem grouping
subsystem "Backend Services" {
    nodes: [PaymentSvc, NotifySvc, OrdersDB]
    color: "#6366f1"
}

# Data flows (edge shorthand)
WebGateway -> OrderAPI -> PaymentSvc -> NotifySvc -> UserInbox
PaymentSvc -> OrdersDB

# Flow definition
flow OrderFlow {
    label: "Order Processing Flow"
    event: OrderCreated
    source: WebGateway
    rate: 1.5
    path: WebGateway -> OrderAPI -> PaymentSvc -> NotifySvc -> UserInbox
}`,

  // MAPIC Mail Processing - Complex routing example
  mapic: `# MAPIC Mail Processing System
# Complex event routing with path-level transformations

# Event definitions
event SortingEvent {
    label: "Sorting Event"
    color: "#3b82f6"
    shape: triangle
    size: medium
}

event NESEvent {
    label: "NES Event"
    color: "#e11d48"
    shape: triangle
    size: medium
}

event NormalizedEvent {
    label: "Normalized"
    color: "#10b981"
    shape: circle
    size: medium
}

event KeyedEvent {
    label: "Keyed"
    color: "#f2f542"
    shape: key
    size: medium
}

event ConsolidatedEvent {
    label: "Consolidated"
    color: "#8b5cf6"
    shape: square
    size: medium
}

# Node definitions - External sources
node sorting {
    label: "Sorting"
    type: topic
    position: (-200, -60)
}

node nes {
    label: "NES"
    type: topic
    position: (-200, 60)
}

# Node definitions - MAPIC Core
node Normalizer {
    label: "Normalizer"
    type: service
    position: (0, 0)
}

node identity {
    label: "Identity"
    type: topic
    position: (250, -50)
}

node KeyProvider {
    label: "Key Provider"
    type: service
    position: (500, -20)
}

node assignment {
    label: "Assignment"
    type: topic
    position: (250, 50)
}

node normalizedEvents {
    label: "Normalized Events"
    type: topic
    position: (200, 200)
}

node Consolidator {
    label: "Consolidator"
    type: service
    position: (400, 200)
}

node mailpieceState {
    label: "Mailpiece State"
    type: topic
    position: (600, 200)
}

node historyMapper {
    label: "History Mapper"
    type: service
    position: (800, 120)
}

node summaryMapper {
    label: "Summary Mapper"
    type: service
    position: (800, 200)
}

node history {
    label: "History"
    type: topic
    position: (1000, 120)
}

node summary {
    label: "Summary"
    type: topic
    position: (1000, 200)
}

# Subsystem grouping
subsystem "MAPIC" {
    nodes: [Normalizer, identity, KeyProvider, assignment, normalizedEvents, Consolidator, mailpieceState, historyMapper, summaryMapper, history, summary]
    color: "#6366f1"
}

# Data flows with explicit sides
sorting:right -> Normalizer:left
nes:right -> Normalizer:left

# Identity resolution loop
Normalizer:top -> identity:left
identity:right -> KeyProvider:left
KeyProvider:bottom -> assignment:right
assignment:left -> Normalizer:right

# Output flow
Normalizer:bottom -> normalizedEvents:left
normalizedEvents:right -> Consolidator:left
Consolidator:right -> mailpieceState:left
normalizedEvents:top -> historyMapper -> history
mailpieceState -> summaryMapper -> summary

# Flows with path-level transformations
flow SortingFlow {
    label: "Sorting Processing"
    event: SortingEvent
    source: sorting
    rate: 2
    path: sorting -> Normalizer[shape=circle, color=#3b82f6] -> identity -> KeyProvider[shape=key, color=#f2f542] -> assignment -> Normalizer[shape=triangle, color=#10b981] -> normalizedEvents -> Consolidator[shape=square] -> mailpieceState
}

flow NESFlow {
    label: "NES Processing"
    event: NESEvent
    source: nes
    rate: 0.3
    path: nes -> Normalizer[shape=circle, color=#e11d48] -> identity -> KeyProvider[shape=key, color=#f2f542] -> assignment -> Normalizer[shape=triangle, color=#f59042] -> normalizedEvents -> Consolidator[shape=square] -> mailpieceState
}`,

  // E-Commerce - Subsystems and multiple event types
  ecommerce: `# E-Commerce Order Processing
# Multiple subsystems and event types with transformations

# Event definitions
event Order {
    label: "Order"
    color: "#3b82f6"
    shape: document
    size: medium
}

event BulkOrder {
    label: "Bulk Order"
    color: "#8b5cf6"
    shape: package
    size: large
}

event AlertEvent {
    label: "Alert"
    color: "#ef4444"
    shape: alert
    size: medium
}

event Payment {
    label: "Payment"
    color: "#10b981"
    shape: package
    size: medium
}

event NotificationMsg {
    label: "Notification"
    color: "#f59e0b"
    shape: message
    size: small
}

# Transformation definitions
transformation ProcessOrder {
    label: "Process Order"
    input: Order
    output: Payment
    delay: 800
}

transformation SendNotify {
    label: "Send Notification"
    input: Payment
    output: NotificationMsg
    delay: 200
}

# Node definitions - Frontend
node web-gateway {
    label: "Web Gateway"
    type: service
    position: (0, 100)
}

node order-api {
    label: "Order API"
    type: service
    position: (150, 100)
}

# Node definitions - Backend
node payment-service {
    label: "Payment Service"
    type: service
    position: (450, 100)
    delay: 800
    transformation: ProcessOrder
}

node inventory-service {
    label: "Inventory Service"
    type: service
    position: (450, 220)
    delay: 400
}

node notification-service {
    label: "Notifications"
    type: service
    position: (650, 100)
    delay: 200
    transformation: SendNotify
}

# Node definitions - Topics
node orders {
    label: "Orders"
    type: topic
    position: (300, 100)
}

node payments {
    label: "Payments"
    type: topic
    position: (550, 100)
}

node inventory-updates {
    label: "Inventory Updates"
    type: topic
    position: (600, 220)
}

# Node definitions - Database
node orders-db {
    label: "Orders DB"
    type: db
    position: (450, 320)
    delay: 300
}

# Subsystem groupings
subsystem "Frontend" {
    nodes: [web-gateway, order-api]
    color: "#06b6d4"
}

subsystem "Backend" {
    nodes: [payment-service, inventory-service, notification-service]
    color: "#6366f1"
}

# Data flows
web-gateway -> order-api -> orders -> payment-service
payment-service -> payments -> notification-service
order-api -> orders -> inventory-service
inventory-service -> inventory-updates
payment-service -> orders-db

# Flows
flow OrderProcessing {
    event: Order
    source: web-gateway
    rate: 1.5
    path: web-gateway -> order-api -> orders -> payment-service -> payments -> notification-service
}

flow BulkOrderProcessing {
    event: BulkOrder
    source: web-gateway
    rate: 0.3
    path: web-gateway -> order-api -> orders -> payment-service -> orders-db
}

flow AlertProcessing {
    event: AlertEvent
    source: web-gateway
    rate: 0.2
    path: web-gateway -> order-api -> orders -> inventory-service -> inventory-updates
}`,

  // ETL Pipeline - Processor chain with transformations
  etl: `# ETL Data Pipeline
# Sequential processing with transformations at each stage

# Event definitions
event DBRecord {
    label: "DB Record"
    color: "#8b5cf6"
    shape: circle
    size: small
}

event FileBatch {
    label: "File Batch"
    color: "#06b6d4"
    shape: square
    size: large
}

event RawData {
    label: "Raw Data"
    color: "#3b82f6"
    shape: circle
    size: medium
}

event TransformedData {
    label: "Transformed"
    color: "#f59e0b"
    shape: square
    size: medium
}

event LoadedData {
    label: "Loaded"
    color: "#10b981"
    shape: triangle
    size: medium
}

# Transformation definitions
transformation Extract {
    label: "Extract"
    input: DBRecord
    output: RawData
    delay: 500
}

transformation Transform {
    label: "Transform"
    input: RawData
    output: TransformedData
    delay: 1000
}

transformation Load {
    label: "Load"
    input: TransformedData
    output: LoadedData
    delay: 300
}

# Node definitions - Sources
node source-db {
    label: "Source Database"
    type: db
    position: (0, 100)
}

node file-ingestion {
    label: "File Ingestion"
    type: external
    position: (0, 220)
}

# Node definitions - Processors
node extractor {
    label: "Extractor"
    type: processor
    position: (200, 160)
    delay: 500
    transformation: Extract
}

node transformer {
    label: "Transformer"
    type: processor
    position: (450, 160)
    delay: 1000
    transformation: Transform
}

node loader {
    label: "Loader"
    type: processor
    position: (700, 160)
    delay: 300
    transformation: Load
}

# Node definitions - Topics
node raw-data {
    label: "Raw Data"
    type: topic
    position: (320, 160)
}

node transformed-data {
    label: "Transformed Data"
    type: topic
    position: (570, 160)
}

# Node definitions - Destination
node data-warehouse {
    label: "Data Warehouse"
    type: db
    position: (850, 160)
    delay: 600
}

# Subsystem grouping
subsystem "Processing" {
    nodes: [extractor, transformer, loader]
    color: "#f59e0b"
}

# Data flows
source-db -> extractor -> raw-data
file-ingestion -> extractor
raw-data -> transformer -> transformed-data
transformed-data -> loader -> data-warehouse

# Flows
flow DBFlow {
    label: "Database Records"
    event: DBRecord
    source: source-db
    rate: 2
    path: source-db -> extractor -> raw-data -> transformer -> transformed-data -> loader -> data-warehouse
}

flow FileFlow {
    label: "File Batches"
    event: FileBatch
    source: file-ingestion
    rate: 0.8
    path: file-ingestion -> extractor -> raw-data -> transformer -> transformed-data -> loader -> data-warehouse
}`
};

/**
 * Get an example by name
 */
export function getExample(name: string): string {
  return EXAMPLES[name as ExampleName] || EXAMPLES.payment;
}
