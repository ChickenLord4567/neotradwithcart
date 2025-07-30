# Trading Dashboard

## Overview

This is a full-stack web trading application that connects to OANDA's live trading API for executing trades on forex and gold instruments. The application provides a cyberpunk-themed trading dashboard with real-time price monitoring, trade management, and account analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom cyberpunk theme (neon colors, dark background)
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Type Safety**: TypeScript throughout the application
- **API Style**: RESTful API endpoints
- **Session Management**: Express sessions for authentication
- **Real-time Updates**: Polling-based updates for prices and trades

### Database Strategy
- **Primary Storage**: In-memory storage (MemStorage class) for development
- **ORM**: Drizzle ORM with PostgreSQL schema definitions
- **Migration Support**: Drizzle Kit for database migrations
- **Trade Logging**: MongoDB Atlas for comprehensive trade history and backup
- **Live Trading**: All trades executed via OANDA practice API, MongoDB only for logging

## Key Components

### Authentication System
- Single-user authentication with hardcoded credentials (admin/admin123)
- Session-based authentication protecting all routes
- Automatic redirect to login for unauthenticated users

### Trading Engine
- **Supported Instruments**: XAUUSD (Gold), EURUSD, GBPUSD, USDJPY
- **Order Types**: Market orders only
- **Trade Parameters**: Lot size, TP1, TP2, Stop Loss
- **Price Source**: Live prices from OANDA API
- **Instrument Mapping**: Converts display format (XAUUSD) to OANDA format (XAU_USD)

### Trade Management
- **Trade Manager**: Background service monitoring active trades every 5 seconds
- **Automatic Execution**: TP1, TP2, and SL levels trigger via OANDA API
- **Manual Controls**: Manual trade closure through UI
- **Position Tracking**: Real-time P&L calculations and status updates

### User Interface Components
- **Dashboard**: Main trading interface with real-time data
- **Trade Setup**: Form for placing new trades with validation
- **Active Trades**: Live monitoring of open positions with P&L
- **Account Overview**: Balance and performance metrics
- **Historical Analysis**: Trade history and statistics
- **Recent Trades**: Table of completed trades

## Data Flow

1. **Price Updates**: OANDA API → Backend polling → Frontend display (2-second intervals)
2. **Trade Placement**: UI form → Validation → OANDA API → Database storage → UI update
3. **Trade Monitoring**: Background service → OANDA position check → Automatic actions → Database update
4. **Account Data**: OANDA account API → Backend processing → UI display (5-second intervals)

## External Dependencies

### OANDA Integration (Live Practice Trading)
- **API**: OANDA v3 REST API practice environment
- **Endpoint**: https://api-fxpractice.oanda.com/v3
- **Trade Execution**: All trades placed via OANDA API with real trade IDs
- **Automated Management**: TP1 (75% partial close), TP2, SL (breakeven after TP1)
- **Manual Controls**: Direct OANDA trade closure via actual trade IDs
- **No Simulation**: MongoDB used only for logging, not trade execution

### Database Services
- **PostgreSQL**: Primary database with Neon serverless hosting
- **MongoDB**: Secondary logging and backup system
- **Connection**: Database URLs required in environment variables

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library
- **Date-fns**: Date manipulation utilities

## Deployment Strategy

### Development Environment
- **Vite**: Frontend build tool with HMR
- **TSX**: TypeScript execution for development server
- **Replit Integration**: Cartographer plugin and error overlay

### Production Build
- **Frontend**: Vite build to `dist/public`
- **Backend**: ESBuild bundle to `dist/index.js`
- **Assets**: Static file serving through Express
- **Environment**: NODE_ENV-based configuration

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `MONGO_URI`: MongoDB connection string  
- `OANDA_API_KEY`: OANDA trading API key
- `OANDA_ACCOUNT_ID`: OANDA account identifier
- `SESSION_SECRET`: Express session encryption key

### Key Features
- **Live Trading**: Real trades executed through OANDA API, not simulation
- **Automatic Risk Management**: TP/SL levels enforced programmatically
- **Real-time Monitoring**: Continuous price and position updates
- **Responsive Design**: Mobile-friendly cyberpunk UI
- **Type Safety**: End-to-end TypeScript with shared schemas