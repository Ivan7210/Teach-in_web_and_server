import asyncio
import pymysql
import websockets
import hashlib
import json
import base64
from datetime import datetime
from PIL import Image


class Source():
    def __init__(self):
        self.start = None
        self.online = []
        self.all = dict()
        self.main_loop = asyncio.get_event_loop()
        self.users_online = []
        self.users = None
        self.db = None
        self.conect = None
        self.message = None
        self.token = None

    # Функция хэширования пароля
    def hash_password(self, data):
        salt = "jhgdjtfytfittiy"
        data = hashlib.md5(data.encode() + salt.encode()).hexdigest()
        return data

    # Получение данных о клиенте по его id
    def get_token(self, id):
        for i in self.users_online:
            if i["id"] == id:
                self.token = i

    # Получение фотографии из базы данных по id
    def get_photo(self, id):
        try:
            self.conect.execute("select avatar user from user where id='%s'" % id)
            image = self.conect.fetchone()
            if image[0]:
                return str(image[0])
            else:
                return None
        except pymysql.err.OperationalError:
            self.conect.close()
            self.db = pymysql.connect(host="tensor123.beget.tech", db="tensor123_mes", user="tensor123_mes",
                                      password="Tensor123")
            self.conect = self.db.cursor()
            self.get_photo(id)

    # Полуение списка онлайн пользоватей для данного клиента
    async def get_online(self, data, websoket, when, job=None, dat=None):
        set1 = set(self.all[int(data["my_id"])])
        set2 = self.online
        go = list()
        if set1 and set2:
            go = list(set1.intersection(set2))
        await websoket.send(json.dumps({"answer": "online", "users": go}))
        if when == "listen":
            await self.listen_socket(websoket)
        else:
            await self.get_message(dat, websoket, job)

    # Получение списка пользователей с кем в чате ты состоишь
    async def all_chat(self, data, websoket):
        try:
            self.conect.close()
            self.conect = self.db.cursor()
            self.conect.execute(
                "select to_id,from_id from message where to_id='%s' or from_id='%s'" %
                (self.token["id"], self.token["id"]))
            chats = self.conect.fetchall()
        except pymysql.err.OperationalError:
            await websoket.send(json.dumps({"answer": "all_chats error", "error": "problem with data base"}))
            await self.listen_socket(websoket)
        chat = set()
        for i in chats:
            for j in i:
                chat.add(j)
        if chat:
            chat.remove(self.token["id"])
        chats = list(chat)
        users = []
        all = set()
        if chats:
            duble = list(self.users)
            for i in range(len(duble)):
                if duble[i][0] in chats:
                    status = "offline"
                    all.add(duble[i][0])
                    for j in range(len(list(self.online))):
                        if duble[i][0] == self.online[j]:
                            status = "online"
                            break
                    users.append({"id": duble[i][0], "name": duble[i][1], "last_name": duble[i][2], "status": status})
            self.all.update({int(data["my_id"]): list(all)})
            users.sort(key=lambda k: k['name'])
        await websoket.send(json.dumps({"answer": "all_chats successful", "users": users}))
        await self.listen_socket(websoket)

    # Поиск нового собеседника среди зарегестрированных
    async def new_chat(self, data, websocket):
        users = []
        duble = list(self.users)
        for i in data["search_keys"]:
            for j in range(len(duble)):
                if str(i).lower() == str(duble[j][1]).lower() or str(i).lower() == str(duble[j][2]).lower():
                    status = "offline"
                    if duble[j][0] in self.online:
                        status = "online"
                    users.append({"id": duble[j][0], "name": duble[j][1], "last_name": duble[j][2],
                                  "bytes": self.get_photo(duble[j][0]), "status": status})
        users = sorted(users, key=lambda k: k['name'])
        if len(users) == 0:
            users = None
        await websocket.send(json.dumps({"answer": "all_find_client", "client": users}))
        await self.listen_socket(websocket)

    # Добавление аватарки в базу данных
    async def add_photo(self, data, when, websoket, job=None, dat=None):
        self.conect.close()
        self.conect = self.db.cursor()
        self.conect.execute(f"UPDATE user set avatar='{data['bytes']}' where id='{data['my_id']}'")
        self.db.commit()
        if when == "listen":
            await self.listen_socket(websoket)
        else:
            await self.get_message(dat, websoket, job)

    # Изменение данных о пользователе
    async def updated_user(self, data, websoket,when,job=None,dat=None):
        self.get_token(data["my_id"])
        if data["name"] == "":
            data["name"] = self.token["name"]
        if data["last_name"] == "":
            data["last_name"] = self.token["last_name"]

        try:
            self.conect.close()
            self.conect = self.db.cursor()
            self.conect.execute(f"UPDATE user SET name='{data['name']}',last_name='{data['last_name']}'"
                                f" WHERE `id`={int(data['my_id'])}")
            self.db.commit()
            await websoket.send(json.dumps({"answer": "successful change"}))
        except pymysql.err.OperationalError:
            await websoket.send(json.dumps({"answer": "updaet error", "error": "problem with data base"}))
            await self.listen_socket(websoket)
        if when == "listen":
            await self.listen_socket(websoket)
        else:
            await self.get_message(dat, websoket, job)

    # Функция отправки сообщений пользователю
    async def get_message(self, data, websocket, job):
        while True:
            message = await websocket.recv()
            message = json.loads(message)
            try:
                if message["request"] == "add_message":
                    time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    message["id"] = int(message["id"])
                    message["my_id"] = int(message["my_id"])
                    my_id = int(message["my_id"])
                    self.conect.close()
                    self.conect = self.db.cursor()
                    self.conect.execute("insert into message (to_id,from_id,content,created_at) values(%s,%s,%s,%s)",
                                        (message["id"], message["my_id"], message["message"], str(time)))
                    job.append([message["id"], message["my_id"], message["message"], time])
                    self.db.commit()
                    await websocket.send(json.dumps({"answer": "send_message"}))
                    for i in range(len(self.users_online)):
                        if int(message["id"]) == self.users_online[i]["id"]:
                            self.get_token(my_id)
                            await self.users_online[i]["soket"].send(
                                json.dumps(
                                    {"answer": "new_message", "from": self.token["name"],
                                     "last_name": self.token["last_name"],
                                     "id": self.token["id"], "message": message["message"], "date": str(time)}))
                            break

                elif message["request"] == "online":
                    await self.get_online(message, websocket, "get", job, data)
                elif message["request"] == "add_photo":
                    await self.add_photo(message, "get", websocket, job, data)
                elif message["request"] == "change_info":
                    await self.updated_user(message, websocket, "get", job, data)
                else:
                    self.get_token(int(message["my_id"]))
                    await self.listen_socket(self.token["soket"], message)
            except ConnectionResetError:
                self.users_online.remove(websocket)
                await self.inisialization(websocket)
            except websockets.ConnectionClosedError:
                self.users_online.remove(websocket)
                await self.inisialization(websocket)
            except pymysql.err.OperationalError:
                self.conect.close()
                await self.conection_data()
                await self.get_message(data, websocket, job)
                await self.listen_socket(websocket)

    # Открытие чата с собеседниками и передача последних 75 сообщений в беседе
    async def open_chat(self, data, websocket):
        data["id"] = int(data["id"])
        try:
            self.conect.execute("select to_id, from_id, content, created_at from message "
                                "where (to_id= %s and from_id= %s) or (to_id=%s and from_id=%s)"
                                % (int(data["my_id"]), int(data["id"]), int(data["id"]), int(data["my_id"])))
            job = list(self.conect.fetchall())
            # self.conect.execute(f"UPDATE message SET `check` = 1 WHERE (to_id={int(data['my_id'])} AND from_id={int(data['id'])}) OR (to_id={int(data['id'])} AND from_id={int(data['my_id'])});")
            # self.db.commit()
            message = []
            duble = list(self.users)
            for j in range(len(duble)):
                if duble[j][0] == data["id"]:
                    break
            for i in range(max(0, (len(job) - 75)), len(job)):
                if job[i][1] == int(data["my_id"]):
                    message.append({"from": "", "last_name": "", "message": job[i][2],
                                    "date": str(job[i][3])})
                else:
                    self.get_token(data["id"])
                    message.append(
                        {"from": duble[j][1], "last_name": duble[j][2], "message": job[i][2], "date": str(job[i][3])})
                    self.get_token(data["my_id"])
            message.sort(key=lambda k : k["date"])
            await websocket.send(json.dumps({"answer": "chats_with", "message": message}))
            await self.get_message(data, websocket, job)
        except ConnectionResetError:
            self.users_online.remove(websocket)
            await self.listen_socket(websocket)
        except websockets.ConnectionClosedError:
            self.users_online.remove(websocket)
            await self.listen_socket(websocket)
        except pymysql.err.OperationalError:
            self.conect.close()
            await self.conection_data()
            await self.open_chat(data, websocket)
            await self.listen_socket(websocket)

        except pymysql.InterfaceError:
            self.conect.close()
            await self.conection_data()
            await self.open_chat(data, websocket)
            return

    # Функция вызова других функций
    async def listen_socket(self, websocket, data=None):
        while True:
            try:
                if data == None:
                    data = await websocket.recv()
                    data = json.loads(data)
                    self.get_token(int(data["my_id"]))
                    websocket = self.token["soket"]
                if data["request"] == "open_chat":
                    await self.open_chat(data, websocket)
                elif data["request"] == "find_users":
                    await  self.new_chat(data, websocket)
                elif data ["request"]=="change_info":
                    await self.updated_user(data, websocket,"listen")
                elif data["request"] == "add_photo":
                    await self.add_photo(data, "listen", websocket)
                elif data["request"] == "all_chats":
                    await self.all_chat(data, websocket)
                elif data["request"] == "log_out":
                    websocket = self.token["soket"]
                    self.users_online.remove(self.token)
                    await self.inisialization(websocket)
                elif data["request"] == "online":
                    await self.get_online(data, websocket, "listen")

            except ConnectionResetError:
                self.users_online.remove(self.token)
                return
            except websockets.ConnectionClosedError:
                self.users_online.remove(self.token)
                return

    # Функция запроса данных о пользователе из базы данных
    def autorize(self, data, websoket):
        try:
            data["password"] = self.hash_password(data["password"])
            self.conect.close()
            self.conect = self.db.cursor()
            self.conect.execute("select ID,name,last_name,pass,avatar from user where email='%s'" % data["email"])
            Query_autor = self.conect.fetchone()
            if Query_autor[3] == data["password"]:
                return (True, Query_autor[0], Query_autor[1], Query_autor[2], Query_autor[3], Query_autor[4])
            else:
                return (False, "no find")
        except pymysql.err.OperationalError:
            return (False, "SQL")
        except:
            return (False, "no find")

    # Функция входа нового пользователя
    async def inisialization(self, websoket):
        await self.conection_data()
        while True:
            try:
                data = await websoket.recv()
                new_data = json.loads(data)
                if new_data['request'] == 'new_token':
                    try:
                        new_data["password"] = self.hash_password(new_data["password"])
                        self.conect.execute("insert into user(name,last_name,pass,email) values(%s,%s,%s,%s)",
                                            (str(new_data["name"]), str(new_data["last_name"]),
                                             str(new_data["password"]), str(new_data["email"])))

                        self.conect = self.db.commit()
                        await self.conection_data()
                        await websoket.send(json.dumps({"answer": "new user successful"}))
                        await self.inisialization(self, websoket)

                    except pymysql.err.OperationalError:
                        await websoket.send(json.dumps({"answer": "new user error", "error": "problem with data base"}))
                    except:
                        await websoket.send(json.dumps({"answer": "new user error", "error": "user create"}))
                elif new_data["request"] == "get_token":
                    self.token = list(self.autorize(new_data, websoket))
                    if self.token[0] == True:
                        if self.token[5] == None:
                            im = Image.open("avatar.jpg")
                            await websoket.send(
                                json.dumps({"answer": "successful autorize", "id": self.token[1], "name": self.token[2],
                                            "last_name": self.token[3], "bytes": str(base64.b64encode(im.tobytes()))}))
                            self.token[5] = im.tobytes()
                        else:
                            await websoket.send(
                                json.dumps({"answer": "successful autorize", "id": self.token[1], "name": self.token[2],
                                            "last_name": self.token[3], "bytes": str(self.token[5])}))
                        if self.token[1] in self.online:
                            for i in range(len(self.users_online)):
                                if self.users_online[i]["id"]==self.token[1]:
                                    self.users_online[i]["soket"]=websoket
                                    break
                        else:
                            self.users.add((self.token[1], self.token[2], self.token[3]))
                            self.online.append(self.token[1])
                            self.users_online.append(
                                {"id": self.token[1], "name": self.token[2], "last_name": self.token[3],
                                 "email": new_data["email"], "password": self.token[4],
                                 "bytes": self.token[5], "soket": websoket})
                        await self.main_loop.create_task(self.listen_socket(websoket))
                    elif self.token[1] == "no find":
                        await websoket.send(json.dumps({"answer": "autorize error", "error": "no find"}))
                    elif self.token[1] == "SQL":
                        await websoket.send(json.dumps({"answer": "autorize error", "error": "problem with data base"}))
                elif new_data["request"] == "confirm_token":
                    for i in range(len(self.users_online)):
                        if self.users_online[i]["id"] == int(new_data["id"]) and self.users_online[i]["name"] == \
                                new_data["name"]:
                            self.users_online[i]["soket"] = websoket
                            await websoket.send(json.dumps({"answer": "successful confirm"}))
                            await self.main_loop.create_task(self.listen_socket(websoket))
            except websockets.exceptions.ConnectionClosedOK:
                return

    async def conection_data(self):
        self.db = pymysql.connect(host="tensor123.beget.tech", db="tensor123_mes", user="tensor123_mes",
                                  password="Tensor123")
        self.conect = self.db.cursor()
        self.conect.execute("select id,name,last_name from user")
        self.users = set(self.conect.fetchall())

    async def main(self, websocket, path):
        print(f"User {websocket.remote_address[0]} connection")
        first = await self.main_loop.create_task(self.inisialization(websocket))
        # second = self.main_loop.create_task(self.conection_data())
        # await asyncio.gather(second, first)


if __name__ == "__main__":
    data = Source()
    data.start = websockets.serve(data.main, "0.0.0.0", 1234)
    print("Server is listening")
    data.main_loop.run_until_complete(data.start)
    data.main_loop.run_forever()
