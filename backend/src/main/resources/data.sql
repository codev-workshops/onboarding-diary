INSERT INTO recruit (id, name, email, department, join_date, created_at) VALUES
  (1, 'Alice Johnson', 'alice.johnson@example.com', 'Engineering', '2024-01-15', '2024-01-15T09:00:00'),
  (2, 'Bob Smith', 'bob.smith@example.com', 'Product', '2024-02-01', '2024-02-01T09:00:00'),
  (3, 'Carla Mendes', 'carla.mendes@example.com', 'Design', '2024-03-10', '2024-03-10T09:00:00');

INSERT INTO tag (id, name) VALUES
  (1, 'training'),
  (2, 'meeting'),
  (3, 'culture'),
  (4, 'technical'),
  (5, 'feedback');

INSERT INTO diary_entry (id, title, content, mood, entry_date, created_at, updated_at, recruit_id) VALUES
  (1, 'First day!', 'Met the team and set up my laptop. Everyone was super welcoming.', 'excited', '2024-01-15', '2024-01-15T17:00:00', '2024-01-15T17:00:00', 1),
  (2, 'Onboarding training', 'Spent the day in onboarding sessions learning about our systems.', 'productive', '2024-01-16', '2024-01-16T17:00:00', '2024-01-16T17:00:00', 1),
  (3, 'So much to learn', 'The codebase is huge and I felt a bit lost, but my mentor helped.', 'overwhelmed', '2024-01-17', '2024-01-17T17:00:00', '2024-01-17T17:00:00', 1),
  (4, 'Product deep dive', 'Learned about the product roadmap and our customers.', 'happy', '2024-02-01', '2024-02-01T17:00:00', '2024-02-01T17:00:00', 2);

INSERT INTO diary_entry_tags (diary_entry_id, tag_id) VALUES
  (1, 3),
  (2, 1),
  (2, 4),
  (3, 4),
  (4, 1),
  (4, 2);

INSERT INTO milestone (id, title, description, achieved_date, recruit_id) VALUES
  (1, 'Completed onboarding training', 'Finished all required onboarding modules.', '2024-01-19', 1),
  (2, 'First pull request merged', 'Shipped my first code change to production.', '2024-01-25', 1),
  (3, 'Led first standup', 'Facilitated the daily standup for the product team.', '2024-02-10', 2);

ALTER TABLE recruit ALTER COLUMN id RESTART WITH 100;
ALTER TABLE tag ALTER COLUMN id RESTART WITH 100;
ALTER TABLE diary_entry ALTER COLUMN id RESTART WITH 100;
ALTER TABLE milestone ALTER COLUMN id RESTART WITH 100;
