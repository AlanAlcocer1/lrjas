-- Marcar miembro = true para quienes ya tienen estaca distinta de Ninguno
INSERT INTO participant_field_values (id, participant_id, field_id, value)
SELECT gen_random_uuid(), p.id, fd.id, true
FROM participants p
INNER JOIN stakes s ON s.id = p.stake_id
INNER JOIN field_definitions fd ON fd.name = 'miembro'
WHERE s.name <> 'Ninguno'
  AND NOT EXISTS (
    SELECT 1
    FROM participant_field_values pfv
    WHERE pfv.participant_id = p.id
      AND pfv.field_id = fd.id
  );

UPDATE participant_field_values pfv
SET value = true
FROM participants p
INNER JOIN stakes s ON s.id = p.stake_id
INNER JOIN field_definitions fd ON fd.name = 'miembro'
WHERE pfv.participant_id = p.id
  AND pfv.field_id = fd.id
  AND s.name <> 'Ninguno'
  AND pfv.value = false;
