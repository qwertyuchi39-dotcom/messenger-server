import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

const server = http.createServer(app);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"]
    }
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);

    socket.on('user_joined', (userData) => {
        console.log('Ползователь вошел:', userData.nickname);

        onlineUsers.set(socket.id, {
            id: socket.id,
            socketId: socket.id, 
            nickname: userData.nickname,
            avatar: userData.avatar
        });

        const usersArray = Array.from(onlineUsers.values());

        io.emit('online_users_update', usersArray);

        console.log('Онлайн пользователей:', usersArray.length);
        });

        socket.on('search_users', (searchTerm) => {
            const usersArray = Array.from(onlineUsers.values());

            const filteredUsers = usersArray.filter(user =>
                user.nickname.toLowercase().includes(searchTerm.toLowercase()) &&
                user.socketId !== socket.id
            );
            socket.emit('search_results', filteredUsers);
        });

        socket.on('send_private_message', (data) => {
            const fromUser = onlineUsers.get(socket.id);

            if (!fromUser) {
                console.log('Отправитель не найден');
                return;
            }

            console.log('Сообщение от', fromUser.nickname, 'к', data.to);

            const recipientEntry = Array.from(onlineUsers.entries()).find(
                ([id, user]) => user.nickname === data.to
            );

                if (recipientEntry && fromUser) {
                    const [recipientId, recipientUser] = recipientEntry;

                    const messageData = {
                        id: Date.now(),
                        from: fromUser.nickname,
                        fromAvatar: fromUser.avatar,
                        to: data.to,
                        text: data.text,
                        timestamp: new Date().toLocaleTimeString()
                    };
                    console.log('Отправляю сообщение пользователю:', recipientUser.nickname);

                    socket.to(recipientId).emit('new_private_message', messageData);

                    socket.emit('new_private_message', {...messageData, isOwn: true});
                } else {
                    console.log('Получатель не найден:', data.to);

                    socket.emit('error_message', {
                        text: `Пользователь ${data.to} не в сети`
                    });
                };
        });

        socket.on('disconnect', () => {
            const user = onlineUsers.get(socket.id);

            if(user) {
                onlineUsers.delete(socket.id);

                const usersArray = Array.from(onlineUsers.values());
                io.emit('online_users_update', usersArray);

                console.log('Пользователь отключился:', user.nickname);
            };
        });
});


app.get('/status', (req, res) => {
    res.json({
        status: 'OK',
        usersOnline: onlineUsers.size,
        message: 'Abrikos Server фурычит!'
    });
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`\n Abrikos Server запущен!`);
    console.log(`Локальный доступ: http://localhost:${PORT}`);
    console.log(`Сетевой доступ: http://ВАШ_IP:${PORT}`);
    console.log(`Статус сервера: http://localhost:${PORT}/status\n`);

    console.log(`Чтобы подключится с телефона:`);
    console.log(`1. Узнай свой IP адрес (ipconfig / ifconfig)`);
    console.log(`2. Замени localhost на твой IP в настройках клиента`);
    console.log(`3. Убедись, что оба устройства в одной WiFi сети`);
});

