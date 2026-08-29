-- ---------------------------------------------------------------------------
-- The gazetteer, first pass: Great Britain, Northern Ireland and Ireland.
--
-- Reference data, so it lives in a migration rather than seed.sql — the same
-- argument as the check catalogue. A hosted database with no places cannot
-- match an auditor to an audit at all.
--
-- ## What a row is
--
-- Roughly a local authority district: the unit a person says out loud when
-- asked where they work. Coordinates are the administrative centre, good to
-- about a kilometre, which is far finer than a travel estimate needs.
--
-- ## What this is not
--
-- Complete. Great Britain has around 360 districts and this is the urban
-- centres plus everywhere the seed data uses. Filling it in is a data-loading
-- job against ONS or OpenStreetMap, not something to hand-write — and an audit
-- booked somewhere absent will fail to resolve a place, which is deliberately
-- visible rather than silently unmatchable.
--
-- Ireland is here for one reason: it has no postcode areas at all, so a single
-- Dublin row is the proof that the model is not quietly still about postcodes.
-- ---------------------------------------------------------------------------

insert into public.place (country_code, name, region, latitude, longitude) values
  -- London
  ('GB', 'Camden',                'Greater London', 51.5290, -0.1255),
  ('GB', 'Islington',             'Greater London', 51.5416, -0.1022),
  ('GB', 'Hackney',               'Greater London', 51.5450, -0.0553),
  ('GB', 'Tower Hamlets',         'Greater London', 51.5203, -0.0293),
  ('GB', 'Southwark',             'Greater London', 51.5035, -0.0804),
  ('GB', 'Lambeth',               'Greater London', 51.4607, -0.1163),
  ('GB', 'Westminster',           'Greater London', 51.4975, -0.1357),
  ('GB', 'Lewisham',              'Greater London', 51.4452, -0.0209),
  ('GB', 'Wandsworth',            'Greater London', 51.4567, -0.1910),
  ('GB', 'Newham',                'Greater London', 51.5255,  0.0352),
  ('GB', 'Haringey',              'Greater London', 51.5906, -0.1110),
  ('GB', 'Greenwich',             'Greater London', 51.4826,  0.0077),
  ('GB', 'Croydon',               'Greater London', 51.3762, -0.0982),
  ('GB', 'Ealing',                'Greater London', 51.5130, -0.3089),
  ('GB', 'Brent',                 'Greater London', 51.5588, -0.2817),
  ('GB', 'Barnet',                'Greater London', 51.6252, -0.1517),
  ('GB', 'Redbridge',             'Greater London', 51.5590,  0.0741),
  ('GB', 'Richmond upon Thames',  'Greater London', 51.4479, -0.3260),

  -- Greater Manchester
  ('GB', 'Manchester',            'Greater Manchester', 53.4808, -2.2426),
  ('GB', 'Salford',               'Greater Manchester', 53.4875, -2.2901),
  ('GB', 'Trafford',              'Greater Manchester', 53.4192, -2.3583),
  ('GB', 'Stockport',             'Greater Manchester', 53.4106, -2.1575),
  ('GB', 'Oldham',                'Greater Manchester', 53.5409, -2.1114),
  ('GB', 'Rochdale',              'Greater Manchester', 53.6097, -2.1561),
  ('GB', 'Bolton',                'Greater Manchester', 53.5768, -2.4282),
  ('GB', 'Bury',                  'Greater Manchester', 53.5933, -2.2966),
  ('GB', 'Tameside',              'Greater Manchester', 53.4806, -2.0810),
  ('GB', 'Wigan',                 'Greater Manchester', 53.5450, -2.6318),

  -- Other English cities
  ('GB', 'Liverpool',             'Merseyside',        53.4084, -2.9916),
  ('GB', 'Warrington',            'Cheshire',          53.3900, -2.5970),
  ('GB', 'Chester',               'Cheshire',          53.1934, -2.8931),
  ('GB', 'Leeds',                 'West Yorkshire',    53.8008, -1.5491),
  ('GB', 'Bradford',              'West Yorkshire',    53.7960, -1.7594),
  ('GB', 'Sheffield',             'South Yorkshire',   53.3811, -1.4701),
  ('GB', 'Birmingham',            'West Midlands',     52.4862, -1.8904),
  ('GB', 'Coventry',              'West Midlands',     52.4068, -1.5197),
  ('GB', 'Wolverhampton',         'West Midlands',     52.5870, -2.1288),
  ('GB', 'Nottingham',            'Nottinghamshire',   52.9548, -1.1581),
  ('GB', 'Leicester',             'Leicestershire',    52.6369, -1.1398),
  ('GB', 'Bristol',               'Avon',              51.4545, -2.5879),
  ('GB', 'Newcastle upon Tyne',   'Tyne and Wear',     54.9783, -1.6178),
  ('GB', 'Sunderland',            'Tyne and Wear',     54.9069, -1.3838),
  ('GB', 'Hull',                  'East Yorkshire',    53.7676, -0.3274),
  ('GB', 'Norwich',               'Norfolk',           52.6309,  1.2974),
  ('GB', 'Southampton',           'Hampshire',         50.9097, -1.4044),
  ('GB', 'Portsmouth',            'Hampshire',         50.8198, -1.0880),
  ('GB', 'Brighton and Hove',     'East Sussex',       50.8225, -0.1372),
  ('GB', 'Reading',               'Berkshire',         51.4543, -0.9781),
  ('GB', 'Oxford',                'Oxfordshire',       51.7520, -1.2577),
  ('GB', 'Cambridge',             'Cambridgeshire',    52.2053,  0.1218),
  ('GB', 'Milton Keynes',         'Buckinghamshire',   52.0406, -0.7594),
  ('GB', 'Plymouth',              'Devon',             50.3755, -4.1427),
  ('GB', 'Exeter',                'Devon',             50.7184, -3.5339),
  ('GB', 'Derby',                 'Derbyshire',        52.9225, -1.4746),
  ('GB', 'Stoke-on-Trent',        'Staffordshire',     53.0027, -2.1794),
  ('GB', 'Preston',               'Lancashire',        53.7632, -2.7031),
  ('GB', 'Blackpool',             'Lancashire',        53.8175, -3.0357),
  ('GB', 'York',                  'North Yorkshire',   53.9600, -1.0873),
  ('GB', 'Luton',                 'Bedfordshire',      51.8787, -0.4200),

  -- Scotland
  ('GB', 'Edinburgh',             'Scotland',          55.9533, -3.1883),
  ('GB', 'Glasgow',               'Scotland',          55.8642, -4.2518),
  ('GB', 'Aberdeen',              'Scotland',          57.1497, -2.0943),
  ('GB', 'Dundee',                'Scotland',          56.4620, -2.9707),
  ('GB', 'Stirling',              'Scotland',          56.1165, -3.9369),
  ('GB', 'Perth',                 'Scotland',          56.3950, -3.4308),

  -- Wales
  ('GB', 'Cardiff',               'Wales',             51.4816, -3.1791),
  ('GB', 'Swansea',               'Wales',             51.6214, -3.9436),
  ('GB', 'Newport',               'Wales',             51.5842, -2.9977),
  ('GB', 'Wrexham',               'Wales',             53.0428, -2.9925),

  -- Northern Ireland
  ('GB', 'Belfast',               'Northern Ireland',  54.5973, -5.9301),
  ('GB', 'Londonderry',           'Northern Ireland',  54.9966, -7.3086),

  -- Ireland. No postcode areas exist here at all, which is the point.
  ('IE', 'Dublin',                'Leinster',          53.3498, -6.2603),
  ('IE', 'Cork',                  'Munster',           51.8985, -8.4756),
  ('IE', 'Galway',                'Connacht',          53.2707, -9.0568),
  ('IE', 'Limerick',              'Munster',           52.6638, -8.6267)
on conflict do nothing;
