package com.rapidphotoflow.common.querydto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private boolean status;
    private String message;
    private int statusCode;
    private T data;
}

