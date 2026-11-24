// Places for the search sheet (components/SearchSheet.tsx). The same lists are
// on the website: frontend/lib/searchDestinations.ts and lib/weekend-getaways.ts.
export interface Suggestion {
  kind: "city" | "area" | "listing";
  label: string;
  sub: string;
  value: string;
  listing_id?: string;
}

export const ALL_LOCAL_DESTINATIONS: Suggestion[] = [
  // Goa
  { kind: "city", label: "Goa", sub: "Goa", value: "Goa" },
  { kind: "city", label: "Candolim", sub: "North Goa, Goa", value: "Candolim" },
  { kind: "city", label: "Calangute", sub: "North Goa, Goa", value: "Calangute" },
  { kind: "city", label: "Panaji", sub: "Goa", value: "Panaji" },
  { kind: "city", label: "Margao", sub: "South Goa, Goa", value: "Margao" },
  // Rajasthan
  { kind: "city", label: "Jaipur", sub: "Rajasthan", value: "Jaipur" },
  { kind: "city", label: "Udaipur", sub: "Rajasthan", value: "Udaipur" },
  { kind: "city", label: "Jodhpur", sub: "Rajasthan", value: "Jodhpur" },
  { kind: "city", label: "Jaisalmer", sub: "Rajasthan", value: "Jaisalmer" },
  { kind: "city", label: "Pushkar", sub: "Ajmer, Rajasthan", value: "Pushkar" },
  { kind: "city", label: "Bikaner", sub: "Rajasthan", value: "Bikaner" },
  { kind: "city", label: "Mount Abu", sub: "Sirohi, Rajasthan", value: "Mount Abu" },
  // Himachal Pradesh
  { kind: "city", label: "Shimla", sub: "Himachal Pradesh", value: "Shimla" },
  { kind: "city", label: "Manali", sub: "Himachal Pradesh", value: "Manali" },
  { kind: "city", label: "Dharamshala", sub: "Kangra, Himachal Pradesh", value: "Dharamshala" },
  { kind: "city", label: "Kasol", sub: "Kullu, Himachal Pradesh", value: "Kasol" },
  { kind: "city", label: "Kasauli", sub: "Solan, Himachal Pradesh", value: "Kasauli" },
  { kind: "city", label: "Dalhousie", sub: "Chamba, Himachal Pradesh", value: "Dalhousie" },
  { kind: "city", label: "Spiti Valley", sub: "Lahaul & Spiti, Himachal Pradesh", value: "Spiti Valley" },
  // Uttarakhand
  { kind: "city", label: "Rishikesh", sub: "Dehradun, Uttarakhand", value: "Rishikesh" },
  { kind: "city", label: "Haridwar", sub: "Uttarakhand", value: "Haridwar" },
  { kind: "city", label: "Mussoorie", sub: "Dehradun, Uttarakhand", value: "Mussoorie" },
  { kind: "city", label: "Dehradun", sub: "Uttarakhand", value: "Dehradun" },
  { kind: "city", label: "Nainital", sub: "Uttarakhand", value: "Nainital" },
  { kind: "city", label: "Jim Corbett", sub: "Nainital, Uttarakhand", value: "Jim Corbett" },
  { kind: "city", label: "Auli", sub: "Chamoli, Uttarakhand", value: "Auli" },
  // Karnataka
  { kind: "city", label: "Bengaluru", sub: "Karnataka", value: "Bengaluru" },
  { kind: "city", label: "Coorg", sub: "Kodagu, Karnataka", value: "Coorg" },
  { kind: "city", label: "Mysore", sub: "Karnataka", value: "Mysore" },
  { kind: "city", label: "Chikmagalur", sub: "Karnataka", value: "Chikmagalur" },
  { kind: "city", label: "Hampi", sub: "Vijayanagara, Karnataka", value: "Hampi" },
  { kind: "city", label: "Gokarna", sub: "Uttara Kannada, Karnataka", value: "Gokarna" },
  { kind: "city", label: "Mangalore", sub: "Karnataka", value: "Mangalore" },
  // Kerala
  { kind: "city", label: "Munnar", sub: "Idukki, Kerala", value: "Munnar" },
  { kind: "city", label: "Kochi", sub: "Ernakulam, Kerala", value: "Kochi" },
  { kind: "city", label: "Alleppey", sub: "Alappuzha, Kerala", value: "Alleppey" },
  { kind: "city", label: "Wayanad", sub: "Kerala", value: "Wayanad" },
  { kind: "city", label: "Varkala", sub: "Trivandrum, Kerala", value: "Varkala" },
  { kind: "city", label: "Kovalam", sub: "Trivandrum, Kerala", value: "Kovalam" },
  { kind: "city", label: "Thekkady", sub: "Idukki, Kerala", value: "Thekkady" },
  // Maharashtra
  { kind: "city", label: "Mumbai", sub: "Maharashtra", value: "Mumbai" },
  { kind: "city", label: "Pune", sub: "Maharashtra", value: "Pune" },
  { kind: "city", label: "Lonavala", sub: "Pune, Maharashtra", value: "Lonavala" },
  { kind: "city", label: "Mahabaleshwar", sub: "Satara, Maharashtra", value: "Mahabaleshwar" },
  { kind: "city", label: "Alibaug", sub: "Raigad, Maharashtra", value: "Alibaug" },
  { kind: "city", label: "Karjat", sub: "Raigad, Maharashtra", value: "Karjat" },
  { kind: "city", label: "Nashik", sub: "Maharashtra", value: "Nashik" },
  // Tamil Nadu & Pondicherry
  { kind: "city", label: "Chennai", sub: "Tamil Nadu", value: "Chennai" },
  { kind: "city", label: "Ooty", sub: "Nilgiris, Tamil Nadu", value: "Ooty" },
  { kind: "city", label: "Kodaikanal", sub: "Dindigul, Tamil Nadu", value: "Kodaikanal" },
  { kind: "city", label: "Pondicherry", sub: "Puducherry (UT)", value: "Pondicherry" },
  { kind: "city", label: "Madurai", sub: "Tamil Nadu", value: "Madurai" },
  // Delhi
  { kind: "city", label: "Delhi", sub: "National Capital Territory (UT)", value: "Delhi" },
  { kind: "city", label: "Gurgaon", sub: "Haryana (NCR)", value: "Gurgaon" },
  { kind: "city", label: "Noida", sub: "Uttar Pradesh (NCR)", value: "Noida" },
  // West Bengal
  { kind: "city", label: "Kolkata", sub: "West Bengal", value: "Kolkata" },
  { kind: "city", label: "Darjeeling", sub: "West Bengal", value: "Darjeeling" },
  { kind: "city", label: "Kalimpong", sub: "West Bengal", value: "Kalimpong" },
  // Uttar Pradesh
  { kind: "city", label: "Agra", sub: "Uttar Pradesh", value: "Agra" },
  { kind: "city", label: "Varanasi", sub: "Uttar Pradesh", value: "Varanasi" },
  { kind: "city", label: "Lucknow", sub: "Uttar Pradesh", value: "Lucknow" },
  // Gujarat
  { kind: "city", label: "Ahmedabad", sub: "Gujarat", value: "Ahmedabad" },
  { kind: "city", label: "Surat", sub: "Gujarat", value: "Surat" },
  { kind: "city", label: "Vadodara", sub: "Gujarat", value: "Vadodara" },
  { kind: "city", label: "Rann of Kutch", sub: "Gujarat", value: "Rann of Kutch" },
  // Jammu & Kashmir & Ladakh
  { kind: "city", label: "Srinagar", sub: "Jammu & Kashmir (UT)", value: "Srinagar" },
  { kind: "city", label: "Gulmarg", sub: "Baramulla, Jammu & Kashmir (UT)", value: "Gulmarg" },
  { kind: "city", label: "Pahalgam", sub: "Anantnag, Jammu & Kashmir (UT)", value: "Pahalgam" },
  { kind: "city", label: "Leh", sub: "Ladakh (UT)", value: "Leh" },
  // Punjab & Haryana
  { kind: "city", label: "Amritsar", sub: "Punjab", value: "Amritsar" },
  { kind: "city", label: "Chandigarh", sub: "Chandigarh (UT)", value: "Chandigarh" },
  // Madhya Pradesh
  { kind: "city", label: "Bhopal", sub: "Madhya Pradesh", value: "Bhopal" },
  { kind: "city", label: "Indore", sub: "Madhya Pradesh", value: "Indore" },
  { kind: "city", label: "Gwalior", sub: "Madhya Pradesh", value: "Gwalior" },
  { kind: "city", label: "Khajuraho", sub: "Chhatarpur, Madhya Pradesh", value: "Khajuraho" },
  // Sikkim & Northeast
  { kind: "city", label: "Gangtok", sub: "Sikkim", value: "Gangtok" },
  { kind: "city", label: "Shillong", sub: "Meghalaya", value: "Shillong" },
  { kind: "city", label: "Guwahati", sub: "Assam", value: "Guwahati" },
  { kind: "city", label: "Cherrapunji", sub: "Meghalaya", value: "Cherrapunji" },
];

export const WEEKEND_GETAWAYS: Record<string, { name: string; hours: string }[]> = {
  Delhi: [
    { name: "Rishikesh",       hours: "5 h drive" },
    { name: "Shimla",          hours: "7 h drive" },
    { name: "Jaipur",          hours: "4 h drive" },
    { name: "Mussoorie",       hours: "6 h drive" },
    { name: "Manali",          hours: "12 h drive" },
  ],
  Mumbai: [
    { name: "Lonavala",        hours: "2 h drive" },
    { name: "Alibaug",         hours: "1.5 h ferry" },
    { name: "Mahabaleshwar",   hours: "5 h drive" },
    { name: "Goa",             hours: "1.5 h flight" },
    { name: "Karjat",          hours: "1.5 h drive" },
  ],
  Bengaluru: [
    { name: "Coorg",           hours: "5 h drive" },
    { name: "Ooty",            hours: "6 h drive" },
    { name: "Wayanad",         hours: "6 h drive" },
    { name: "Chikmagalur",     hours: "4 h drive" },
    { name: "Pondicherry",     hours: "5 h drive" },
  ],
};
