const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stake = await prisma.stake.findFirst({
    where: { name: 'Ninguno' },
    include: { wards: true },
  });
  if (!stake || !stake.wards[0]) throw new Error('Ninguno stake/ward missing');

  const p = await prisma.participant.upsert({
    where: { code: '000' },
    update: { active: true },
    create: {
      code: '000',
      firstName: 'Admin',
      lastName: 'Prueba',
      motherLastName: 'Actividades',
      age: 25,
      birthDate: new Date('2000-01-01'),
      sex: 'MALE',
      type: 'MEMBER',
      stakeId: stake.id,
      wardId: stake.wards[0].id,
    },
  });

  const role = await prisma.accessRole.findUnique({ where: { name: 'Administrador' } });
  if (!role) throw new Error('Administrador role missing');

  await prisma.participantAccessRole.upsert({
    where: {
      participantId_roleId: { participantId: p.id, roleId: role.id },
    },
    create: { participantId: p.id, roleId: role.id },
    update: {},
  });

  console.log('OK', p.code, role.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
