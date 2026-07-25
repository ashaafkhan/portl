-- Seed Data for Portl Demo

-- 1. Create Society
INSERT INTO societies (id, name, address) 
VALUES ('b861cdb6-681a-45c1-90a6-805f8892f3cb', 'Prestige Shantiniketan', 'Whitefield, Bangalore');

-- 2. Create Towers
INSERT INTO towers (id, society_id, name) VALUES 
('82fae51a-64dc-4613-bedc-bd9f2de2d8fc', 'b861cdb6-681a-45c1-90a6-805f8892f3cb', 'Tower A'),
('f8fbd8b0-bfb0-4617-bb91-c1bc6df0ff4f', 'b861cdb6-681a-45c1-90a6-805f8892f3cb', 'Tower B');

-- 3. Create Flats
INSERT INTO flats (id, tower_id, number) VALUES 
('f0000000-0000-0000-0000-000000000001', '82fae51a-64dc-4613-bedc-bd9f2de2d8fc', '401'),
('f0000000-0000-0000-0000-000000000002', '82fae51a-64dc-4613-bedc-bd9f2de2d8fc', '402'),
('f0000000-0000-0000-0000-000000000003', '82fae51a-64dc-4613-bedc-bd9f2de2d8fc', '403'),
('f0000000-0000-0000-0000-000000000004', 'f8fbd8b0-bfb0-4617-bb91-c1bc6df0ff4f', '101'),
('f0000000-0000-0000-0000-000000000005', 'f8fbd8b0-bfb0-4617-bb91-c1bc6df0ff4f', '102'),
('f0000000-0000-0000-0000-000000000006', 'f8fbd8b0-bfb0-4617-bb91-c1bc6df0ff4f', '103');

-- 4. Create Profiles
-- Note: In a real app, these IDs would match auth.users.id created via Supabase Auth
INSERT INTO profiles (id, society_id, role, full_name, phone, flat_id) VALUES 
('a0000000-0000-0000-0000-000000000001', 'b861cdb6-681a-45c1-90a6-805f8892f3cb', 'admin', 'Society Admin', '+919999999999', NULL),
('g0000000-0000-0000-0000-000000000001', 'b861cdb6-681a-45c1-90a6-805f8892f3cb', 'guard', 'Security Guard (Gate 1)', '+918888888888', NULL),
('r0000000-0000-0000-0000-000000000001', 'b861cdb6-681a-45c1-90a6-805f8892f3cb', 'resident', 'Rahul Sharma', '+917777777777', 'f0000000-0000-0000-0000-000000000002'),
('r0000000-0000-0000-0000-000000000002', 'b861cdb6-681a-45c1-90a6-805f8892f3cb', 'resident', 'Priya Patel', '+916666666666', 'f0000000-0000-0000-0000-000000000004');

-- 5. Create Amenities
INSERT INTO amenities (id, society_id, name, description, capacity, open_time, close_time) VALUES
('m0000000-0000-0000-0000-000000000001', 'b861cdb6-681a-45c1-90a6-805f8892f3cb', 'Swimming Pool', 'Main clubhouse pool', 20, '06:00:00', '22:00:00'),
('m0000000-0000-0000-0000-000000000002', 'b861cdb6-681a-45c1-90a6-805f8892f3cb', 'Tennis Court', 'Court 1', 4, '06:00:00', '21:00:00');

-- 6. Create Notices
INSERT INTO notices (society_id, title, body, pinned, created_by) VALUES
('b861cdb6-681a-45c1-90a6-805f8892f3cb', 'Water Supply Interruption', 'Water supply will be interrupted between 2 PM and 4 PM tomorrow due to tank cleaning.', TRUE, 'a0000000-0000-0000-0000-000000000001'),
('b861cdb6-681a-45c1-90a6-805f8892f3cb', 'Yoga Classes Starting', 'New weekend yoga classes are starting in the clubhouse from this Saturday.', FALSE, 'a0000000-0000-0000-0000-000000000001');

-- 7. Dummy Visitor and Request (Delivery for Rahul)
INSERT INTO visitors (id, name, category, phone) VALUES 
('v0000000-0000-0000-0000-000000000001', 'Amazon Delivery', 'delivery', '+915555555555');

INSERT INTO visitor_requests (visitor_id, flat_id, created_by, status) VALUES
('v0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'g0000000-0000-0000-0000-000000000001', 'pending');
