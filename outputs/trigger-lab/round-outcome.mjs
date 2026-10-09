export const TEST_DISTANCE_LIMIT=250;
export function roundOutcome(s){
 if(s.broken)return 'broken';
 if(s.distance>TEST_DISTANCE_LIMIT)return 'limit';
 if(s.speed===0)return 'stopped';
 return null;
}
