export const CITY_ALIASES = {
  'bangalore': 'Bengaluru', 'bengaluru': 'Bengaluru', 'bengalore': 'Bengaluru',
  'mumbai': 'Mumbai', 'bombay': 'Mumbai', 'delhi': 'Delhi', 'new delhi': 'Delhi',
  'chennai': 'Chennai', 'madras': 'Chennai', 'hyderabad': 'Hyderabad', 'pune': 'Pune',
  'kolkata': 'Kolkata', 'calcutta': 'Kolkata', 'ahmedabad': 'Ahmedabad',
  'jaipur': 'Jaipur', 'kochi': 'Kochi', 'cochin': 'Kochi',
}

export function getCityCenter(city) {
  const centers = {
    'Mumbai': [19.0760, 72.8777], 'Delhi': [28.6139, 77.2090],
    'Bengaluru': [12.9716, 77.5946], 'Chennai': [13.0827, 80.2707],
    'Hyderabad': [17.3850, 78.4867], 'Pune': [18.5204, 73.8567],
    'Kolkata': [22.5726, 88.3639], 'Ahmedabad': [23.0225, 72.5714],
    'Jaipur': [26.9124, 75.7873], 'Kochi': [9.9312, 76.2673],
  }
  return centers[city] ?? [20.5937, 78.9629]
}
