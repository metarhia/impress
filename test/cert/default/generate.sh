cd "$(dirname "$0")"
openssl genrsa -out key.pem 3072
openssl req -new -out self.pem -key key.pem -subj '/CN=localhost'
openssl req -text -noout -in self.pem
openssl x509 -req -days 1024 -in self.pem -signkey key.pem -out cert.pem -extfile generate.ext
