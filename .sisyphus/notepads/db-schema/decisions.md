
- Decision: Use auth.uid() cast to uuid for RLS policies to ensure cross-table consistency.
- Do not add indexes yet; avoid premature optimization as per plan.
