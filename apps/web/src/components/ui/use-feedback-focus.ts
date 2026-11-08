'use client';
import {useEffect,useRef} from 'react';

/** Bring submitted-form feedback into view without discarding the draft. */
export function useFeedbackFocus(message: string | null) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!message) return;
    ref.current?.focus({preventScroll:true});
    ref.current?.scrollIntoView({block:'center',behavior:'instant'});
  }, [message]);
  return ref;
}
