import { PetCard } from '@/ui/PetCard';
import { ReminderCard } from '@/ui/ReminderCard';

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Moji mazlíčci</h1>
      
      <div className="space-y-3">
        <PetCard name="Max" species="Pes" breed="Labrador" age="3 roky" />
        <PetCard name="Mia" species="Kočka" breed="Britská" age="2 roky" />
      </div>

      <h2 className="text-xl font-semibold pt-4">Připomínky</h2>
      <ReminderCard 
        type="odčervení" 
        petName="Max" 
        dueDate="2026-11-01" 
        product="Milbemax" 
      />
      <ReminderCard 
        type="očkování" 
        petName="Mia" 
        dueDate="2026-10-20" 
      />
    </div>
  );
}
