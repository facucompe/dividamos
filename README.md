# Dividamos - Expense Splitter

A simple web app to track shared expenses among friends and calculate who owes money to whom.

## Features

- Add friends to your group
- Track expenses with custom descriptions and amounts
- Automatically split costs among selected participants
- See simplified debt settlements (minimized number of transactions)
- Data persisted to GitHub repository (accessible from any device)

## How It Works

1. **Add Friends**: Start by adding all your friends' names
2. **Record Expenses**: When someone pays for something, record:
   - What was purchased (description)
   - Total amount
   - Who paid
   - Who should split the cost
3. **View Settlements**: The app automatically calculates the optimal way to settle all debts

## Setup

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file (optional for local testing):
```bash
cp .env.example .env.local
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel

1. Push this code to a GitHub repository

2. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Give it a name like "Dividamos App"
   - Select the **`repo`** scope (full control of private repositories)
   - Click "Generate token" and copy it

3. Deploy to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables:
     - `GITHUB_TOKEN`: Your GitHub token from step 2
     - `GITHUB_REPO`: Your repo in format `username/repo`
   - Deploy!

4. The app will now persist data to `data/expenses.json` in your GitHub repo

## Environment Variables

- `GITHUB_TOKEN`: GitHub Personal Access Token with repo permissions
- `GITHUB_REPO`: Your repository in format `username/repo`

**Note**: Without these variables, the app will work locally but won't persist data across Vercel deployments.

## How Debt Calculation Works

The app uses a simplified debt algorithm:

1. Calculate each person's balance (total paid - total owed)
2. Separate people into creditors (positive balance) and debtors (negative balance)
3. Match debtors with creditors to minimize number of transactions

**Example**:
- Alice paid $30 for dinner (split 3 ways)
- Bob paid $20 for drinks (split 3 ways)
- Charlie paid $10 for dessert (split 3 ways)

Balances: Alice: +$20, Bob: +$10, Charlie: -$30

Settlement: Charlie pays $20 to Alice and $10 to Bob

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **GitHub API** - Data persistence
- **Vercel** - Hosting

## License

MIT
