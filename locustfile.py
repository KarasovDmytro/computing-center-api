from locust import HttpUser, task, between
import random

COMPUTER_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

class RegularUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        with self.client.post("/auth/login", json={
            "login": "dev", 
            "password": "123"
        }, catch_response=True) as response:
            if "Невірний логін або пароль" in response.text:
                response.failure("Помилка авторизації: невірні дані")

    @task(2)
    def start_session(self):
        computer_id = random.choice(COMPUTER_IDS)

        with self.client.post("/session/start", json={
            "computerId": computer_id
        }, allow_redirects=False, catch_response=True) as response:

            if response.status_code == 302 and '/auth/login' in response.headers.get('Location', ''):
                response.failure("Не авторизовано (перенаправлення на логін)")
            
            elif response.status_code == 302 and '/computer' in response.headers.get('Location', ''):
                response.success()
            
            elif response.status_code >= 400:
                response.failure(f"Помилка сервера: {response.status_code}")

class AdminUser(HttpUser):
    wait_time = between(2, 5)

    def on_start(self):
        self.client.post("/auth/login", json={
            "login": "admin",
            "password": "admin"
        })

    @task
    def load_sessions_page(self):
        self.client.get("/session/?page=1&status=all")