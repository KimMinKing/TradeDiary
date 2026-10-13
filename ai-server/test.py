count=[2,2,3]
for i in range(1,len(count)):
    count[i]+=count[i-1]
print(count)
