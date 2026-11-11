# Phase 8 & 9: Planes, Límites y Endurecimiento de Seguridad

## Decisiones arquitectónicas y de alcance

1. **Planes y Límites sin pasarela de pagos externa (Stripe)**:
   - Debido a restricciones regionales en Venezuela, se optó por un sistema de planes robusto (`Free`, `Pro`, `Enterprise`) con un endpoint de **checkout simulado** seguro (`/api/orgs/[orgSlug]/billing/simulate-upgrade`).
   - Los límites en base de datos (`maxDocuments`, `maxMembers`) se validan directamente en los servicios de negocio (`createDocument`, `createInvitation`) lanzando excepciones controladas (`ForbiddenError`) si se superan las cuotas del plan actual.

2. **Seguridad y Endurecimiento**:
   - Cabeceras HTTP de seguridad (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Content-Security-Policy`) configuradas directamente en `next.config.ts`.
   - Protección integral de rutas mediante autenticación Auth.js, guards de sesión y verificación de roles y membresías tenant-aware.

3. **Pruebas y Calidad**:
   - Suite completa de pruebas unitarias implementada con Vitest cubriendo políticas de acceso, lógica de negocio y sanitización.
   - Compilación y verificación continua libre de errores (`npm run build`, `npm test` y `npm run lint` superados con éxito).
