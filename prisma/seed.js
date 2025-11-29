const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.session.deleteMany();
  await prisma.computer.deleteMany();
  await prisma.user.deleteMany();

  await prisma.computer.createMany({
    data: [
      { inventoryNumber: 'PC-101', location: 'Аудиторія 305', status: 'AVAILABLE' },
      { inventoryNumber: 'PC-102', location: 'Аудиторія 305', status: 'BUSY' },
      { inventoryNumber: 'PC-103', location: 'Аудиторія 305', status: 'MAINTENANCE' },
      { inventoryNumber: 'SRV-01', location: 'Серверна',      status: 'AVAILABLE' },
    ]
  });
  
  await prisma.user.createMany({
    data: [
      { 
        pib: 'Головний Адміністратор', 
        login: 'admin', 
        password: 'admin', 
        role: 'DB_ADMIN',
        accessGroup: 'root' 
      },
      { 
        pib: 'Петренко Петро (Програміст)', 
        login: 'dev', 
        password: '123', 
        role: 'PROGRAMMER', 
        accessGroup: 'development' 
      },
      { 
        pib: 'Іваненко Іван (Оператор)', 
        login: 'operator', 
        password: '123', 
        role: 'OPERATOR', 
        accessGroup: 'support' 
      },
      { 
        pib: 'Сидоренко Сидір (Технік)', 
        login: 'tech', 
        password: '123', 
        role: 'HARDWARE_SPECIALIST', 
        accessGroup: 'hardware' 
      },
      { 
        pib: 'Новий Користувач', 
        login: 'user', 
        password: '123', 
        role: 'USER', 
        accessGroup: 'guest' 
      }
    ]
  });

  const programmer = await prisma.user.findUnique({ where: { login: 'dev' } });
  const busyPc = await prisma.computer.findUnique({ where: { inventoryNumber: 'PC-102' } });

  if (programmer && busyPc) {
    await prisma.session.create({
      data: {
        userId: programmer.id,
        computerId: busyPc.id,
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), 
      }
    });
  }

  const operator = await prisma.user.findUnique({ where: { login: 'operator' } });
  const server = await prisma.computer.findUnique({ where: { inventoryNumber: 'SRV-01' } });

  if (operator && server) {
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(9, 0, 0);

    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(14, 0, 0);

    await prisma.session.create({
      data: {
        userId: operator.id,
        computerId: server.id,
        startTime: yesterdayStart,
        endTime: yesterdayEnd
      }
    });
  }

  console.log('🚀 Seeding was ended.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });