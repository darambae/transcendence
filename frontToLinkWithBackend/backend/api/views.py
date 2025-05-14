from django.shortcuts import render

from django.shortcuts import render
from django.http import JsonResponse

def get_data(request):
    data = {'message': 'This is the home page, sent through API'}
    return JsonResponse(data)


# Create your views here.
