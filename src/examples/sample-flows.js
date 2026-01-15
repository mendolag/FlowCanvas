/**
 * Sample DSL topologies for FlowCanvas
 * Updated with new features: event sources, delays, transformations, subsystems
 */

export const EXAMPLES = {
  simple: `# MAPIC Mail Processing System
# External event sources (Manual Layout)
sorting: topic, x=-200, y=-60
nes: topic, x=-200, y=60

# MAPIC Core Subsystem
subsystem "MAPIC":
  Normalizer: service, x=0, y=0
  
  # Identity resolution loop
  identity: topic, x=250, y=-50
  KeyProvider: service, x=500, y=-20
  assignment: topic, x=250, y=50
  
  # Consolidation flow
  normalizedEvents: topic, x=200, y=200
  Consolidator: service, x=400, y=200
  mailpieceState: topic, x=600, y=200

# Data flows
# Entry flow
sorting:right -> Normalizer:left
nes:right -> Normalizer:left

# Identity resolution loop (clean cycle)
Normalizer:top -> identity:left
identity:right -> KeyProvider:left
KeyProvider:bottom -> assignment:right
assignment:left -> Normalizer:right

# Output flow
Normalizer:bottom -> normalizedEvents:left
normalizedEvents:right -> Consolidator:left
Consolidator:right -> mailpieceState:left

# Event types
events:
  - name: sorting
    color: "#3b82f6"
    shape: triangle
    source: sorting
    rate: 2
    path: sorting -> Normalizer[shape=circle, color=#3b82f6] -> identity -> KeyProvider[shape=circle, color=#f2f542] -> assignment -> Normalizer[shape=triangle, color=#10b981] -> normalizedEvents -> Consolidator[shape=square] -> mailpieceState

  - name: nes
    color: "#e11d48"
    shape: triangle
    source: nes
    rate: 0.3
    path: nes -> Normalizer[shape=circle, color=#e11d48] -> identity -> KeyProvider[shape=circle, color=#f2f542] -> assignment -> Normalizer[shape=triangle, color=#f59042] -> normalizedEvents -> Consolidator[shape=square] -> mailpieceState`,

  ecommerce: `# E-Commerce Order Processing with Subsystems

# Frontend subsystem
subsystem "Frontend":
  order-api: service
  web-gateway: service

# Backend subsystem  
subsystem "Backend":
  payment-service: service, delay=800, transform=square, transformColor=#10b981
  inventory-service: service, delay=400
  notification-service: service, delay=200, transform=triangle, transformColor=#f59e0b

# Kafka Topics (messaging layer)
orders: topic, partitions=6
payments: topic, partitions=3
inventory-updates: topic, partitions=3

# Database
orders-db: db, delay=300

# Data flows
web-gateway -> order-api -> orders -> payment-service
payment-service -> payments -> notification-service
order-api -> orders -> inventory-service
inventory-service -> inventory-updates
payment-service -> orders-db

# Events with different sizes
events:
  - name: order
    color: "#3b82f6"
    shape: circle
    size: medium
    source: web-gateway
    rate: 1.5
  - name: bulk-order
    color: "#8b5cf6"
    shape: circle
    size: large
    source: web-gateway
    rate: 0.3`,

  etl: `# ETL Data Pipeline
# Sources
source-db: db
file-ingestion: external

# Processing (with delays and transformations)
extractor: processor, delay=500
transformer: processor, delay=1000, transform=square
loader: processor, delay=300, transform=triangle, transformColor=#10b981

# Topics
raw-data: topic, partitions=4
transformed-data: topic, partitions=4

# Destination
data-warehouse: db, delay=600

# Pipeline flow
source-db -> extractor -> raw-data
file-ingestion -> extractor
raw-data -> transformer -> transformed-data
transformed-data -> loader -> data-warehouse

# Events with different sizes
events:
  - name: db-record
    color: "#8b5cf6"
    shape: circle
    size: small
    source: source-db
    rate: 2
  - name: file-batch
    color: "#06b6d4"
    shape: square
    size: large
    source: file-ingestion
    rate: 0.8`
};

/**
 * Get an example by name
 * @param {string} name - Example name
 * @returns {string} - DSL text
 */
export function getExample(name) {
  return EXAMPLES[name] || EXAMPLES.simple;
}
