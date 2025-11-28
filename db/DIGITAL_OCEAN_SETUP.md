# Digital Ocean MySQL Setup Guide

## Step 1: Create Database on Digital Ocean

1. Go to your Digital Ocean dashboard
2. Create a new MySQL database cluster
3. Choose your plan and region
4. Note down:
   - **Host**: `your-db-name.db.ondigitalocean.com`
   - **Port**: Usually `25060` (for SSL connections)
   - **Database name**: Created automatically or you can specify
   - **Username**: Default user or custom
   - **Password**: Set during creation

## Step 2: Configure Firewall

Make sure your database allows connections from:
- **Vercel IPs**: Add `0.0.0.0/0` temporarily, or use Digital Ocean's trusted sources
- **Your local IP**: If testing locally

Note: For production, restrict to specific IPs or use Digital Ocean's connection pooling.

## Step 3: Run the Schema

### Option A: Using MySQL Client

```bash
mysql -h your-host.db.ondigitalocean.com -P 25060 -u your-username -p your-database-name < db/schema.sql
```

When prompted, enter your password.

### Option B: Using MySQL Workbench or DBeaver

1. Connect to your Digital Ocean database using SSL
2. Select your database
3. Open `db/schema.sql` file
4. Execute the script

### Option C: Using Digital Ocean Console

1. Go to your database in Digital Ocean dashboard
2. Click on "Console" tab
3. Copy and paste the contents of `db/schema.sql`
4. Execute

## Step 4: Verify Tables

After running the schema, verify tables were created:

```sql
SHOW TABLES;
```

You should see:
- `parking_slots`
- `parking_sessions`

Verify indexes:

```sql
SHOW INDEX FROM parking_slots;
SHOW INDEX FROM parking_sessions;
```

## Step 5: Test Connection

Update your `.env.local`:

```env
MYSQL_HOST=your-host.db.ondigitalocean.com
MYSQL_PORT=25060
MYSQL_USER=your-username
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=your-database-name
MYSQL_SSL=true
```

Then test your application locally before deploying to Vercel.

## Important Notes

- **SSL is required**: Digital Ocean databases use SSL by default
- **Port 25060**: This is the SSL port (3306 is for non-SSL)
- **Connection Pooling**: Consider using Digital Ocean's connection pooling for better performance
- **Backups**: Digital Ocean provides automatic backups - configure your backup schedule

## Troubleshooting

### Connection refused
- Check firewall rules in Digital Ocean
- Verify you're using port `25060` (SSL port)
- Ensure `MYSQL_SSL=true` in your env

### SSL certificate error
- The schema sets `rejectUnauthorized: false` which is safe for Digital Ocean's self-signed certs
- This is already configured in `src/lib/db.ts`

### Slow queries
- Indexes are already added in the schema
- Consider adding more indexes based on your query patterns
- Use Digital Ocean's query insights to identify slow queries

