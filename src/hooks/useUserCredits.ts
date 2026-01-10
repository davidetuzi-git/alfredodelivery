import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserCredit {
  id: string;
  user_id: string;
  amount: number;
  description: string | null;
  order_id: string | null;
  expires_at: string;
  reminder_sent_at: string | null;
  created_at: string;
  used_at: string | null;
  used_in_order_id: string | null;
}

export function useUserCredits() {
  const [credits, setCredits] = useState<UserCredit[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCredits = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCredits([]);
        setTotalBalance(0);
        setLoading(false);
        return;
      }

      // Get available (unused, not expired) credits
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (error) {
        console.error('Error loading credits:', error);
        return;
      }

      const creditsData = (data || []) as unknown as UserCredit[];
      setCredits(creditsData);
      
      // Calculate total balance
      const total = creditsData.reduce((sum, credit) => sum + Number(credit.amount), 0);
      setTotalBalance(total);
    } catch (error) {
      console.error('Error in loadCredits:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  // Mark credits as used (FIFO - first expiring first)
  const useCredits = async (amountToUse: number, orderId: string): Promise<{ success: boolean; amountUsed: number; remainingToPay: number }> => {
    if (amountToUse <= 0 || totalBalance <= 0) {
      return { success: true, amountUsed: 0, remainingToPay: amountToUse };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, amountUsed: 0, remainingToPay: amountToUse };
      }

      let remainingToDeduct = Math.min(amountToUse, totalBalance);
      let totalUsed = 0;

      // Sort credits by expiry date (FIFO)
      const sortedCredits = [...credits].sort(
        (a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
      );

      for (const credit of sortedCredits) {
        if (remainingToDeduct <= 0) break;

        const creditAmount = Number(credit.amount);
        const amountFromThisCredit = Math.min(creditAmount, remainingToDeduct);

        if (amountFromThisCredit === creditAmount) {
          // Use entire credit
          const { error } = await supabase
            .from('user_credits')
            .update({
              used_at: new Date().toISOString(),
              used_in_order_id: orderId
            })
            .eq('id', credit.id);

          if (error) {
            console.error('Error marking credit as used:', error);
            continue;
          }
        } else {
          // Partial use - mark original as used and create new credit with remainder
          const { error: updateError } = await supabase
            .from('user_credits')
            .update({
              used_at: new Date().toISOString(),
              used_in_order_id: orderId,
              amount: amountFromThisCredit
            })
            .eq('id', credit.id);

          if (updateError) {
            console.error('Error updating partial credit:', updateError);
            continue;
          }

          // Create new credit for remainder
          const remainder = creditAmount - amountFromThisCredit;
          const { error: insertError } = await supabase
            .from('user_credits')
            .insert({
              user_id: user.id,
              amount: remainder,
              description: `Resto da credito ${credit.id.slice(0, 8)}`,
              expires_at: credit.expires_at
            });

          if (insertError) {
            console.error('Error creating remainder credit:', insertError);
          }
        }

        remainingToDeduct -= amountFromThisCredit;
        totalUsed += amountFromThisCredit;
      }

      // Reload credits
      await loadCredits();

      return {
        success: true,
        amountUsed: totalUsed,
        remainingToPay: amountToUse - totalUsed
      };
    } catch (error) {
      console.error('Error using credits:', error);
      return { success: false, amountUsed: 0, remainingToPay: amountToUse };
    }
  };

  // Get days until earliest credit expires
  const getDaysUntilNextExpiry = (): number | null => {
    if (credits.length === 0) return null;
    
    const sortedCredits = [...credits].sort(
      (a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
    );
    
    const nextExpiry = new Date(sortedCredits[0].expires_at);
    const now = new Date();
    const diffTime = nextExpiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  return {
    credits,
    totalBalance,
    loading,
    useCredits,
    refreshCredits: loadCredits,
    getDaysUntilNextExpiry
  };
}
