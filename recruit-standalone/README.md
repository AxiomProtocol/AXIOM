# Axiom Steward Recruitment Microsite

Standalone recruitment page for `recruit.axiomprotocol.app`

## Setup on Replit

1. Create a new Repl from this folder
2. Run `npm install`
3. Deploy the project
4. In your main Replit account, go to Domains for axiomprotocol.app
5. Add an A record: hostname `recruit`, same IP as main domain
6. Link the subdomain in this project's deployment settings

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Notes

- Form submissions go directly to `axiomprotocol.app/api/stewards/interest`
- Tracks `source: 'subdomain'` to identify traffic from this microsite
- All links point back to the main axiomprotocol.app site
