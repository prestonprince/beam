# Agent Guidelines for Beam

## Build/Test Commands

- `bun run dev` - Start development server
- `bun run build` - Build all packages
- `bun run test` - Run all tests
- `bun run lint` - Run linting
- `bun run typecheck` - Run TypeScript checks
- Single test: `cd packages/app && bun run test -- <test-file>`

## Code Style

- Use TypeScript with strict mode enabled
- Import paths: Use `@/` alias for src directory imports
- Formatting: Follow existing patterns, semicolons, double quotes for strings
- Components: Use function declarations, destructure props with types
- Naming: camelCase for variables/functions, PascalCase for components
- Error handling: Use proper TypeScript error types, handle async errors

## Framework Specifics

- React 19 with TanStack Router for routing
- Tailwind CSS with shadcn/ui components
- Use `cn()` utility from `@/lib/utils` for className merging
- Hono for backend API routes
- Cloudflare Workers for deployment

## Component Guidelines

- Install new shadcn components: `pnpx shadcn@latest add <component>`
- Use Radix UI primitives through shadcn
- Follow existing button/card patterns for consistency
