// shared gazetteer list for pii entities

const P_LIST = [
  'Kushal Subbayya Hegde', 'Pushpa Kushal Hegde', 'Rajesh Kushal Hegde',
  'Rohit Kushal Hegde', 'Rakhi Girija Shetty',
  'Sandesh Bhagwat', 'Amod Joshi', 'Sarthak Malvadkar', 'Ganesh Prasad',
  'Lokesh Shah', 'Soumavo Sarkar', 'Kishan Rastogi', 'Abhijit Diwan',
  'Shanti Gopalkrishnan', 'Prakash Boricha',
  'Eric Bacha', 'Sachin Gawade', 'Pravin Teli', 'Siddharth Jadhav',
  'Tushar Gavankar', 'Hitesh Ramani', 'Chitra Raste', 'Sharmila Joshi',
  'Cherag Gyara', 'Manisha Shukla', 'Tushar Wakhele', 'Ashish Mathew Pulloor',
  'Karunakar Hegde', 'Karunakar Bhandary', 'Narayana B. Shetty',
  'DM Shetty', 'SA Shetty', 'Jayaram Shetty', 'Gopal BO',
].sort((a, b) => b.length - a.length);

const C_LIST = [
  'KSH International Limited', 'KSH Logistics Private Limited',
  'Nuvama Wealth Management Limited', 'ICICI Securities Limited',
  'Link Intime India Private Limited', 'Kirtane & Pandit LLP',
  'HDFC Bank Limited', 'ICICI Bank Limited', 'Citibank N.A.',
  'Export-Import Bank of India', 'IndusInd Bank Limited',
  'Federal Bank Limited', 'Bajaj Finance Limited', 'State Bank of India',
  'Axis Bank Limited', 'Kotak Mahindra Bank Limited', 'Bank of Baroda',
  'Union Bank of India', 'Canara Bank', 'Yes Bank Limited',
  'RBL Bank Limited', 'IDFC First Bank Limited',
  'Bombay Stock Exchange Limited', 'National Stock Exchange of India Limited',
  'Securities and Exchange Board of India',
  'National Securities Depository Limited',
  'Central Depository Services (India) Limited',
  'Reserve Bank of India', 'BSE Limited', 'NSE Limited',
  'Ministry of Corporate Affairs', 'Registrar of Companies', 'MUFG Bank, Ltd.',
  'Broad Family Trust', 'Dhaulagiri Family Trust', 'Everest Family Trust',
  'Makalu Family Trust', 'Annapurna Family Trust',
].sort((a, b) => b.length - a.length);

const A_LIST = [
  'Gat No. 11/3, 11/4, 11/5, Village Birdewadi',
  '7th Floor, The Ruby, 29 Senapati Bapat Marg, Dadar (West), Mumbai',
  'C-101, 1st Floor, 247 Park, Lal Bahadur Shastri Marg, Vikhroli (West), Mumbai - 400 083',
  '163, 5th Floor, H.T.Parekh Marg Backbay Reclamation Churchgate, Mumbai',
  'SEBI Bhavan, Plot No. C4-A, G Block, Bandra Kurla Complex, Bandra (East), Mumbai - 400 051',
  'Exchange Plaza, C-1, Block G, Bandra Kurla Complex, Bandra (East), Mumbai - 400 051',
  'Phiroze Jeejeebhoy Towers, Dalal Street, Fort, Mumbai - 400 001',
  'Bandra Kurla Complex, Bandra (East), Mumbai - 400 051',
  'Dalal Street, Fort, Mumbai - 400 001',
  'Churchgate, Mumbai - 400020',
].sort((a, b) => b.length - a.length);

module.exports = { P_LIST, C_LIST, A_LIST };
