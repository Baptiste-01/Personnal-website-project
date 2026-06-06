import prisma from './lib/prisma'

async function makeAdmin() {
  try {
    const user = await prisma.user.updateMany({
      where: { username: { equals: 'smikens', mode: 'insensitive' } },
      data: { isAdmin: true }
    })
    console.log(`Updated ${user.count} user(s) to admin.`)
  } catch (error) {
    console.error('Error:', error)
  }
}

makeAdmin()
