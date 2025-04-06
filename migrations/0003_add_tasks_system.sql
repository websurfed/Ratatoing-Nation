-- Ensure the tables exist with the correct schema
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_job TEXT NOT NULL,
  assigned_to INTEGER REFERENCES users(id) ON DELETE CASCADE,
  original_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('template', 'pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payouts (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  paid_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_job ON tasks(assigned_job);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_original_task_id ON tasks(original_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_payouts_job ON payouts(job);
CREATE INDEX IF NOT EXISTS idx_payouts_paid_by ON payouts(paid_by);
CREATE INDEX IF NOT EXISTS idx_payouts_task_id ON payouts(task_id);