# Meraki.ai - Modern Web Application

## Overview
Meraki.ai is a modern web application built with Next.js 15, TypeScript, and a comprehensive set of UI components. The application features authentication, dashboard functionality, spreadsheet capabilities, and a settings management system.

## Tech Stack
- **Framework:** Next.js 15.1.0
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** Clerk
- **State Management:** Redux Toolkit
- **UI Components:** Radix UI
- **Form Handling:** React Hook Form with Zod validation
- **Additional Features:**
  - Theme support (next-themes)
  - Modern UI components (shadcn/ui)
  - Charts (Recharts)
  - Toast notifications (Sonner)
  - Date handling (date-fns)

## Project Structure
```
├── app/                  # Next.js app directory
│   ├── dashboard/       # Dashboard related pages
│   ├── spreadsheet/    # Spreadsheet functionality
│   ├── settings/       # User settings
│   ├── sign-in/        # Authentication pages
│   └── sign-up/        # User registration
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── context/           # React context providers
├── types/             # TypeScript type definitions
└── public/            # Static assets
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables:
   Create a `.env.local` file with necessary configurations

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Build for production:
   ```bash
   pnpm build
   ```

## Features
- 🔐 Authentication and Authorization
- 📊 Dashboard Interface
- 📝 Spreadsheet Functionality
- 🎨 Theme Customization
- ⚙️ User Settings Management
- 📱 Responsive Design
- 🔄 Real-time Updates

## Development Guidelines
- Follow TypeScript best practices
- Use provided UI components from the component library
- Implement proper error handling
- Write clean, maintainable code
- Follow the established project structure

## Contributing
[Your contribution guidelines here]

## License
[Your license information here]
