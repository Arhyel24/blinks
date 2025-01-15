Here’s the updated README for your project:

---

# PUBG Solo TPP Kill Challenge  

**Prove your worth in a PUBG Solo TPP kill challenge!**  
Challenge your friends to a wagered battle of skill in the ultimate PUBG solo showdown. Set the stakes, define the time limit, and prove your shooting and strategy skills. The player with the most kills at the end of the match claims both the bragging rights and the wagered amount.  

---

## 🚀 Features  
1. **Challenge Creation:** Players can create a challenge by specifying their PUBG username, wager amount, and match duration.  
2. **Dynamic Linking:** A unique link is generated for each challenge to share with opponents.  
3. **Kill Tracking:** Real-time tracking of kills during a Solo TPP match determines the winner.  
4. **Secure and Transparent:** All wagers are managed securely, and match results are validated using PUBG's API.  

---

## 🛠️ Built With  
- **Framework:** [Next.js](https://nextjs.org/)  
- **APIs:** PUBG API for player kill tracking  
- **Languages:** TypeScript/JavaScript  
- **Styling:** CSS Modules or Tailwind CSS  

---

## 📦 Installation  

### Prerequisites  
1. Node.js >= 16.x  
2. A PUBG API key (sign up at [PUBG Developer](https://developer.pubg.com/)).  
3. Solana wallet setup for handling wagers (optional).  

### Steps  
1. Clone the repository:  
   ```bash
   git clone https://github.com/your-repo/pubg-kill-challenge.git
   cd pubg-kill-challenge
   ```  

2. Install dependencies:  
   ```bash
   npm install
   ```  

3. Create a `.env.local` file in the root directory with the following:  
   ```env
    MONGODB_URI= MONGODB database uri
    SECRET_KEY= Wallet secret key for pool (base64 encoded)
    NEXT_PUBLIC_PUBG_KEY= PUBG API KEY
    POOL_WALLET_ADDRESS= Wallet address for pool
   ```  

4. Run the development server:  
   ```bash
   npm run dev
   ```  
   The app will be available at [http://localhost:3000](http://localhost:3000).  

---

## 🌐 Hosting  

### Vercel (Recommended)  
1. Install the Vercel CLI:  
   ```bash
   npm i -g vercel
   ```  

2. Deploy the project:  
   ```bash
   vercel
   ```  

3. Add environment variables in the Vercel dashboard under **Project Settings > Environment Variables**:  
   - `NEXT_PUBLIC_PUBG_KEY`
   - `MONGODB_URI`  
   - `SECRET_KEY` 
   - `POOL_WALLET_ADDRESS` 

## 📖 Usage  

1. **Create a Challenge:**  
   - Navigate to the app and create a challenge using your PUBG player tag, wager amount, and match duration.  

2. **Share the Challenge Link:**  
   - Share the generated link with friends to accept the challenge.  

3. **Track Kills and Win:**  
   - The app will fetch and display real-time kill stats to determine the winner.

## 🛠️ API Endpoints  

- **Create Challenge:**  
  ```bash
  POST /api/create-pubg-challenge?tag={tag}&amount={amount}&duration={duration}
  ```  
  **Parameters:**  
  - `tag`: PUBG player tag (e.g., `#QRPQLGYGR`)  
  - `amount`: Wager amount (in SOL)  
  - `duration`: Duration of the challenge (e.g., `10`, `20`, `30` minutes)  

## 🐞 Troubleshooting  

### Common Errors  
1. **"No Players Found Matching Criteria":**  
   Ensure the provided player tag is correct and matches an active PUBG account.  

2. **"API Key Invalid":**  
   Verify the PUBG API key in your `.env.local` file.  
