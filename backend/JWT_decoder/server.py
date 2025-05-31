import grpc
from concurrent import futures
import jwt
import decoder_pb2
import decoder_pb2_grpc
import os

class JWTDecoderServicer(jwt_decoder_pb2_grpc.JWTDecoderServicer):
    def DecodeJWT(self, request, context):
        try:
            decoded = jwt.decode(request.token, os.getenv(JWT_SECRET), algorithms=['HS256'] options={"verify_signature": False})
            
            decoded_data = str(decoded)
            print(f"Decoded data : {decoded_data}", file=sys.stderr)
            
            return jwt_decoder_pb2.JWTResponse(decoded_data=decoded_data)
        except jwt.ExpiredSignatureError:
            context.set_details('Expired signature.')
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            return jwt_decoder_pb2.JWTResponse(decoded_data='Error: Expired signature.')
        except jwt.InvalidTokenError:
            context.set_details('Invalid token.')
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            return jwt_decoder_pb2.JWTResponse(decoded_data='Error: Invalid token.')

# Fonction pour démarrer le serveur gRPC
def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    jwt_decoder_pb2_grpc.add_JWTDecoderServicer_to_server(JWTDecoderServicer(), server)
    server.add_insecure_port('[::]:50051')
    server.start() 
    print("Server is running on port 50051...", file=sys.stderr)
    try:
        while True:
            time.sleep(60 * 60 * 24)
    except KeyboardInterrupt:
        server.stop(0)

if __name__ == '__main__':
    serve()
