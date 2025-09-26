# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| dev     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue for security vulnerabilities
2. Email security concerns to the project maintainer
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes

## Security Considerations

### API Security

- Rate limiting applied to all endpoints
- Session-based authentication for single-user deployment
- Input validation on all user-provided data
- SQL injection protection via Prisma ORM

### Data Protection

- Conversation data stored locally in your database
- No data sent to third parties except chosen AI model providers
- Environment variables properly isolated
- Exported conversations excluded from version control

### Streaming Security

- WebSocket connections include rate limiting
- SSE endpoints validate input and apply CORS properly
- All streaming includes proper error handling and cleanup

### Development Security

- Dependencies regularly updated
- TypeScript strict mode enabled
- Linting rules enforce security best practices
- Test coverage for security-relevant code paths

## Best Practices for Deployment

### Environment Variables

```bash
# Never commit these to version control
OPENROUTER_API_KEY=your_key_here
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_secret_here
```

### Database Security

- Use strong database passwords
- Enable SSL for database connections in production
- Regular database backups
- Restrict database access to application only

### Network Security

- Use HTTPS in production
- Configure proper CORS policies
- Implement reverse proxy for additional security
- Monitor for unusual traffic patterns

### Dependency Security

```bash
npm audit                    # Check for vulnerabilities
npm audit fix               # Fix automatically fixable issues
```

## Responsible Disclosure

We appreciate security researchers who responsibly disclose vulnerabilities. We commit to:

1. Acknowledging receipt of vulnerability reports within 48 hours
2. Providing regular updates on remediation progress
3. Crediting researchers (unless they prefer to remain anonymous)
4. Fixing confirmed vulnerabilities in a timely manner

## Security Updates

Security updates will be:

- Released as soon as possible after confirmation
- Clearly marked in release notes
- Documented in CHANGELOG.md
- Announced in project communications

Thank you for helping keep this project secure!
