import { PrismaClient } from '@prisma/client';
import { upsertMasterUser } from '../src/bootstrap/ensure-master-user';

const prisma = new PrismaClient();

async function main() {
  await upsertMasterUser(prisma);

  const stakesData = [
    {
      name: 'Estaca Centro',
      wards: ['Barrio Libertad', 'Barrio San José', 'Barrio El Carmen'],
    },
    {
      name: 'Estaca Norte',
      wards: ['Barrio Los Olivos', 'Barrio La Paz', 'Barrio Vista Hermosa'],
    },
    {
      name: 'Estaca Sur',
      wards: ['Barrio Santa Rosa', 'Barrio Las Flores', 'Barrio El Prado'],
    },
    {
      name: 'Estaca Oriente',
      wards: ['Barrio Nueva Esperanza', 'Barrio Los Pinos', 'Barrio San Miguel'],
    },
  ];

  for (const stakeData of stakesData) {
    const stake = await prisma.stake.upsert({
      where: { name: stakeData.name },
      update: {},
      create: { name: stakeData.name },
    });

    for (const wardName of stakeData.wards) {
      await prisma.ward.upsert({
        where: { name_stakeId: { name: wardName, stakeId: stake.id } },
        update: {},
        create: { name: wardName, stakeId: stake.id },
      });
    }
  }

  const fieldDefs = [
    { name: 'ex_misionero', label: 'Ex Misionero', required: false },
    { name: 'instituto', label: 'Participa en Instituto', required: false },
    { name: 'recomendacion', label: 'Tiene recomendación vigente', required: false },
  ];

  for (const field of fieldDefs) {
    await prisma.fieldDefinition.upsert({
      where: { name: field.name },
      update: { label: field.label },
      create: {
        name: field.name,
        label: field.label,
        type: 'CHECKBOX',
        required: field.required,
        active: true,
      },
    });
  }

  await prisma.fieldDefinition.updateMany({
    where: { name: 'primera_vez' },
    data: { active: false },
  });

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
